# agent_core/router.py

from flask import Flask, jsonify, request
import logging

# Configure basic logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

app = Flask(__name__)

# It's good practice to use Flask's own logger when available,
# as it integrates well with Flask extensions and Gunicorn.
# Gunicorn will capture app.logger output by default.
logger = app.logger 
logger.setLevel(logging.INFO) # Ensure app logger also respects INFO level

@app.route("/collapse", methods=["POST"])
def collapse():
    logger.info(f"Request to /collapse from {request.remote_addr}")
    return jsonify({"status": "triggered", "collapse_id": "Δ001"})

@app.route("/mesh", methods=["GET"])
def mesh():
    logger.info(f"Request to /mesh from {request.remote_addr}")
    return jsonify({"projects": ["secrets-agent"], "tools": ["SummarizeTranscript"]})

@app.route("/tools", methods=["GET"])
def tools():
    logger.info(f"Request to /tools from {request.remote_addr}")
    return jsonify(["SummarizeTranscript", "ChronoMeshSync"])

@app.errorhandler(Exception)
def handle_exception(e):
    # Log the error including stack trace
    logger.error(f"Unhandled exception: {e}", exc_info=True)
    # Return a generic error response to the client
    return jsonify(error=str(e), message="An unexpected error occurred on the server."), 500

if __name__ == "__main__":
    # When running directly with `python router.py`, this setup applies.
    # BasicConfig might conflict if Gunicorn is also trying to set up root logger handlers.
    # For Gunicorn, configure logging via Gunicorn's options.
    # Using app.logger as shown above is generally more robust for Flask apps.
    app.run(port=5042)