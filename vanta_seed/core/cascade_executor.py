import logging
from typing import Any, Dict, Optional, List
import yaml
import os
import re

logger = logging.getLogger(__name__)

class CascadeExecutor:
    """
    CascadeExecutor is responsible for loading cascade definitions, executing cascades step-by-step,
    and logging all events according to the agentic protocol. It integrates with VantaMasterCore.
    """
    def __init__(self, vmc: Any):
        """
        Args:
            vmc: Reference to the VantaMasterCore instance for agent/task execution and logging.
        """
        self.vmc = vmc
        self.cascades = {}  # type: Dict[str, Any]
        self._load_cascade_definitions()

    def _load_cascade_definitions(self):
        """
        Loads cascade definitions from the agent_cascade_definitions.mdc file.
        Finds the first 'profiles:' YAML list and parses it.
        """
        mdc_path = os.path.join(os.path.dirname(__file__), '../../.cursor/rules/agent_cascade_definitions.mdc')
        mdc_path = os.path.abspath(mdc_path)
        try:
            with open(mdc_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            in_profiles_block = False
            yaml_str_to_parse = ""
            
            for line in lines:
                stripped_line = line.strip()
                if stripped_line == "profiles:":
                    in_profiles_block = True
                    yaml_str_to_parse = "profiles:\n" # Start of the YAML doc
                    continue
                
                if in_profiles_block:
                    # If line is part of the profiles list (starts with space then dash, or just dash if it's the first line of a profile)
                    if line.startswith('  -') or (yaml_str_to_parse.endswith('profiles:\n') and line.startswith('-')):
                        yaml_str_to_parse += line
                    # If it's an indented line (part of a multi-line value)
                    elif line.startswith('    ') or line.startswith('  '): # Allow for different indent levels
                        if not yaml_str_to_parse.endswith('\n'): # Ensure previous line ended with newline for correct YAML
                             yaml_str_to_parse += '\n' 
                        yaml_str_to_parse += line
                    # If line is empty or a comment within the block, keep it if it helps structure
                    elif not stripped_line or stripped_line.startswith('#'):
                        yaml_str_to_parse += line 
                    # If it is not part of the YAML list, the block ends
                    else:
                        in_profiles_block = False
                        break # Stop processing lines for this block
            
            if not yaml_str_to_parse or yaml_str_to_parse == "profiles:\n":
                logger.error("CascadeExecutor: No 'profiles:' YAML content found or block is empty.")
                return

            data = yaml.safe_load(yaml_str_to_parse)
            if isinstance(data, dict) and 'profiles' in data:
                for profile in data['profiles']:
                    pid = profile.get('profile_id')
                    if pid:
                        self.cascades[pid] = profile
                logger.info(f"CascadeExecutor: Loaded {len(self.cascades)} cascade profiles.")
            else:
                logger.error(f"CascadeExecutor: Parsed YAML from MDC does not contain a 'profiles' list or is not a dict. Parsed data: {data}")
        except yaml.YAMLError as ye:
            logger.error(f"CascadeExecutor: YAML parsing error in cascade definitions: {ye}\nContent attempted to parse:\n{yaml_str_to_parse}", exc_info=True)    
        except Exception as e:
            logger.error(f"CascadeExecutor: Failed to load cascade definitions: {e}", exc_info=True)

    def trigger_cascade(self, cascade_id: str, initial_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Triggers execution of a cascade by ID.
        Args:
            cascade_id: The identifier of the cascade to execute.
            initial_data: Optional initial data/context for the cascade.
        Returns:
            Dict with execution result/status.
        """
        logger.info(f"CascadeExecutor: Triggering cascade '{cascade_id}' with initial_data: {initial_data}")
        profile = self.cascades.get(cascade_id)
        if not profile:
            logger.error(f"CascadeExecutor: Cascade profile '{cascade_id}' not found.")
            return {"status": "error", "message": f"Cascade profile '{cascade_id}' not found."}
        agent_sequence = profile.get('agent_sequence', [])
        step_results = {"initial_data": initial_data or {}}
        for idx, step in enumerate(agent_sequence):
            step_name = step.get('name', f'step_{idx+1}')
            agent_id = step.get('agent') or step.get('agent_id')
            task_data = step.get('task_data') or step.get('input_mapping') or {}
            # Render Jinja-style variables (very basic: only initial_data and previous step outputs)
            # For demo, just replace {{ step_results.initial_data.* }} and {{ step_results.step_X_output.* }}
            rendered_task_data = {}
            for k, v in task_data.items():
                if isinstance(v, str):
                    val = v
                    # Replace {{ step_results.initial_data.* }}
                    if '{{ step_results.initial_data.' in val:
                        for key in (initial_data or {}):
                            val = val.replace(f'{{{{ step_results.initial_data.{key} }}}}', str((initial_data or {}).get(key, '')))
                    # Replace {{ step_results.step_X_output.* }}
                    for prev_idx in range(1, idx+1):
                        prev_key = f'step_{prev_idx}_output'
                        if prev_key in step_results:
                            for outk, outv in step_results[prev_key].items():
                                val = val.replace(f'{{{{ step_results.{prev_key}.{outk} }}}}', str(outv))
                    rendered_task_data[k] = val
                else:
                    rendered_task_data[k] = v
            # Call agent via VMC
            if not agent_id:
                logger.error(f"CascadeExecutor: Step {step_name} missing agent_id.")
                step_results[f'{step_name}_output'] = {"status": "error", "message": "Missing agent_id"}
                break
            logger.info(f"CascadeExecutor: Executing step '{step_name}' with agent '{agent_id}' and data {rendered_task_data}")
            result = self.vmc.execute_agent_task_sync(agent_id, "cascade_step", rendered_task_data)
            step_results[f'{step_name}_output'] = result
            if result.get('status') != 'success':
                logger.error(f"CascadeExecutor: Step '{step_name}' failed: {result}")
                if step.get('on_failure', '').upper() == 'LOG_AND_HALT':
                    break
        logger.info(f"CascadeExecutor: Cascade '{cascade_id}' completed. Step results: {step_results}")
        return {"status": "success", "cascade_id": cascade_id, "step_results": step_results} 