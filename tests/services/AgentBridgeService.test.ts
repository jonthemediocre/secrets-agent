import { AgentBridgeService } from '../../src/services/AgentBridgeService.js';
import { expect } from 'chai';
import { join } from 'path';
import { promises as fs } from 'fs';
import sinon from 'sinon';
import { describe, it, before, after, beforeEach, afterEach } from 'mocha';

describe('AgentBridgeService MCP Filesystem Methods', () => {
  let service: AgentBridgeService;
  let sandbox: sinon.SinonSandbox;
  const testDir = join(__dirname, '..', 'fixtures');
  const testFile = join(testDir, 'test.txt');
  const testContent = 'test content';

  before(async () => {
    // Create test fixtures
    await fs.mkdir(testDir, { recursive: true });
    await fs.writeFile(testFile, testContent);
  });

  after(async () => {
    // Clean up test fixtures
    await fs.rm(testDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    service = new AgentBridgeService('python3', './cli.py');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('mcpReadFile', () => {
    it('should read file contents successfully', async () => {
      const result = await service.mcpReadFile(testFile);
      expect(result.success).to.be.true;
      expect(result.content).to.equal(testContent);
      expect(result.metadata).to.exist;
    });

    it('should handle non-existent files', async () => {
      const result = await service.mcpReadFile('nonexistent.txt');
      expect(result.success).to.be.false;
      expect(result.error).to.include('not found');
    });

    it('should handle read errors gracefully', async () => {
      const mockError = new Error('Mock read error');
      sandbox.stub(fs, 'readFile').rejects(mockError);
      const result = await service.mcpReadFile(testFile);
      expect(result.success).to.be.false;
      expect(result.error).to.include('Mock read error');
    });
  });

  describe('mcpListDirectory', () => {
    const testSubDir = join(testDir, 'subdir');
    const testSubFile = join(testSubDir, 'subfile.txt');

    before(async () => {
      await fs.mkdir(testSubDir, { recursive: true });
      await fs.writeFile(testSubFile, 'subfile content');
    });

    it('should list directory contents successfully', async () => {
      const result = await service.mcpListDirectory(testDir);
      expect(result.success).to.be.true;
      expect(result.items).to.be.an('array');
      expect(result.items?.length).to.be.greaterThan(0);
      expect(result.items?.find(i => i.name === 'test.txt')).to.exist;
    });

    it('should handle pattern filtering', async () => {
      const result = await service.mcpListDirectory(testDir, '*.txt');
      expect(result.success).to.be.true;
      expect(result.items?.every(i => i.name.endsWith('.txt'))).to.be.true;
    });

    it('should handle non-existent directories', async () => {
      const result = await service.mcpListDirectory('nonexistent');
      expect(result.success).to.be.false;
      expect(result.error).to.include('not found');
    });
  });

  describe('mcpSearchFiles', () => {
    before(async () => {
      // Create more test files for search
      await fs.writeFile(join(testDir, 'test1.txt'), 'content1');
      await fs.writeFile(join(testDir, 'test2.log'), 'content2');
    });

    it('should find files by pattern successfully', async () => {
      const result = await service.mcpSearchFiles(testDir, '*.txt');
      expect(result.success).to.be.true;
      expect(result.matches).to.be.an('array');
      expect(result.matches?.length).to.be.greaterThan(0);
      expect(result.matches?.every(m => m.name.endsWith('.txt'))).to.be.true;
    });

    it('should handle recursive search', async () => {
      const result = await service.mcpSearchFiles(testDir, '*.txt', true);
      expect(result.success).to.be.true;
      expect(result.matches?.some(m => m.path.includes('subdir'))).to.be.true;
    });

    it('should handle no matches gracefully', async () => {
      const result = await service.mcpSearchFiles(testDir, '*.nonexistent');
      expect(result.success).to.be.true;
      expect(result.matches).to.be.an('array').that.is.empty;
    });
  });
}); 