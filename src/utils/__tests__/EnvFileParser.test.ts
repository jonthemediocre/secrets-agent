import { parseEnvFile } from '../EnvFileParser';

describe('parseEnvFile', () => {
  it('parses simple key-value pairs', () => {
    const content = 'KEY=value\nFOO=bar';
    expect(parseEnvFile(content)).toEqual({ KEY: 'value', FOO: 'bar' });
  });

  it('ignores comments and empty lines', () => {
    const content = `
    # This is a comment
    KEY=value

    # Another one
    FOO=bar
    `;
    expect(parseEnvFile(content)).toEqual({ KEY: 'value', FOO: 'bar' });
  });

  it('handles quoted values and export syntax', () => {
    const content = `export HELLO="World"\nexport SPACED='A B C'`;
    expect(parseEnvFile(content)).toEqual({ HELLO: 'World', SPACED: 'A B C' });
  });

  it('handles various forms of malformed or incomplete input gracefully', () => {
    // A line with no equals sign is ignored by dotenv.parse
    const noEqualsSign = 'NO_EQUALS_SIGN';
    expect(parseEnvFile(noEqualsSign)).toEqual({});

    // A key with an equals sign but no value gets an empty string value
    const keyWithoutValue = 'KEY_WITHOUT_VALUE=';
    expect(parseEnvFile(keyWithoutValue)).toEqual({ KEY_WITHOUT_VALUE: '' });

    // A mix of valid, ignored, and incomplete lines
    const mixedContent = 'VALID=true\nMALFORMED_IGNORED_LINE\nEMPTY_VALUE_KEY=\n#comment\nANOTHER_VALID=false';
    expect(parseEnvFile(mixedContent)).toEqual({
      VALID: 'true',
      EMPTY_VALUE_KEY: '',
      ANOTHER_VALID: 'false'
    });
    
    // If the catch block in parseEnvFile itself were to be hit 
    // (e.g., if dotenv.parse threw a truly unexpected error, not typical for string inputs),
    // then it would return {}. This test focuses on dotenv.parse's typical handling.
  });
}); 