# Rego Rule (OPA Style)
package secretsagent

default allow = false

allow {
  input.path == "/notebooks"
  input.filename.endswith(".ipynb")
  input.env.OPENAI_API_KEY
}