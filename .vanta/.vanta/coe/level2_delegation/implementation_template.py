
# CoE Delegation Implementation Template
# Following cursor rules 1015 and 1016

class Level2GovernanceAgent:
    def suggest_governance_change(self, context):
        proposal = self._generate_governance_proposal(context)
        
        # Following rule 1015: Do not implement directly
        # Instead trigger CoE review
        coe_request = {
            "type": "governance_rule_modification",
            "context": context,
            "proposal": proposal,
            "requester_agent": self.agent_id,
            "severity": "critical" if self._is_critical_change(proposal) else "mandatory"
        }
        
        # Following rule 1016: Use proper invocation method
        self.orchestrator.trigger_coe(coe_request)
        # OR: self.event_bus.publish("coe_review_request", coe_request)
        
        return {"status": "delegated_to_coe", "request_id": coe_request["id"]}
    
    def handle_compliance_violation(self, violation):
        if violation.severity == "CRITICAL":
            # Immediate CoE escalation for critical violations
            self._escalate_to_coe("critical_compliance_violation", violation)
        else:
            # Standard handling for non-critical
            self._apply_standard_remediation(violation)
