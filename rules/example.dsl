# AgentDSL (future CLI-compatible declarative syntax)
WHEN file.type == "notebook" AND path.includes("notebooks") THEN
  USE SummarizeNotebook
  REQUIRES ENV OPENAI_API_KEY
  RUN agent NotebookAgent
  PRIORITY high