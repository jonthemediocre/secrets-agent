# ADR-VMC-KEB-001: Kernel Event Bus (KEB) Design

**Date:** 2023-10-05

## Status

Proposed

## Context

The Vanta AI OS, orchestrated by `VantaMasterCore` (VMC), is envisioned as an adaptive, "living" system composed of multiple interacting AI agents and components. The "Secrets Agent" application, while capable of standalone operation, is also designed to evolve into a foundational "agentic infrastructure component" that can integrate into this larger Vanta ecosystem.

To facilitate robust, decoupled, and asynchronous communication within this potentially complex multi-agent system, a Kernel Event Bus (KEB) is necessary. The KEB will:

*   Enable standardized event-driven interactions.
*   Promote modularity, allowing agents and services to evolve independently.
*   Enhance system scalability by distributing event processing.
*   Improve observability, forming the basis for features like a Live Dynamic Workflow Diagram.
*   Allow for a more reactive architecture where components can respond to significant occurrences across the Vanta ecosystem.

This ADR formalizes the decision and high-level design for the KEB.

## Decision

1.  **Broker Technology:** **Redis Streams** has been selected as the message broker for the KEB.
    *   *Rationale:* Redis is already planned for caching (`THEPLAN.md`, Section 3.1), offering a good balance of performance, simplicity, and features like consumer groups suitable for event bus patterns. It's less heavyweight than alternatives like Kafka for initial phases.

2.  **Client Implementation:** A core `KEBClient` has been developed (`vanta_seed/core/keb_client.py`).
    *   *Capabilities:* Provides foundational publish/subscribe capabilities and consumer group management for interacting with Redis Streams.

3.  **Event Schema Strategy:**
    *   Standardized event schemas will be defined in **YAML format** and stored under the `/event_schemas/` directory.
    *   Initial schemas cover core categories: `task_events.yaml`, `system_events.yaml`, `agent_lifecycle_events.yaml`, and `vmc_control_events.yaml`.
    *   *Rationale:* YAML provides human-readable and machine-parseable schema definitions. Centralized schemas ensure consistency.

4.  **Event Routing & Consumption Model:**
    *   `VantaMasterCore` (VMC) will act as a central hub and orchestrator for many critical system events but will also be a KEB participant.
    *   Agents and services will publish events to specific streams/topics and subscribe to relevant streams using consumer groups.
    *   The KEB enables asynchronous, many-to-many communication patterns.

5.  **Governance:**
    *   Event schema validation, naming conventions, versioning, and integration practices will be governed by a dedicated MDC rule: `.cursor/rules/101-event-governance.mdc`.
    *   This includes integration into CI/CD for validation.

## Consequences

*   **Infrastructure Requirements:** A running Redis instance is required. Its configuration (standalone, cluster, cloud-managed) will depend on the deployment environment's scale and HA needs.
*   **Operational Considerations:**
    *   Monitoring of Redis Streams (e.g., stream length, consumer lag, error rates).
    *   Strategies for event schema versioning and evolution to maintain backward/forward compatibility or manage breaking changes.
    *   Debugging distributed workflows can be more complex, necessitating good correlation IDs and comprehensive logging around event publishing/consumption.
*   **Development Impact:**
    *   Developers building agents or services for the Vanta ecosystem will need to understand and use the `KEBClient` and adhere to defined event schemas.
    *   Increased initial complexity for simple interactions, offset by long-term benefits in decoupling and scalability.
*   **Benefits Realized:**
    *   **Decoupling:** Components can operate and be updated independently.
    *   **Scalability:** Individual event consumer groups or services can be scaled based on load.
    *   **Observability:** Centralized event flow allows for better system-wide monitoring and tracing, enabling features like the "Live Dynamic Workflow Diagram."
    *   **Standardization:** Common event formats improve interoperability.
    *   **Reactivity:** Enables the system to be truly event-driven.
*   **Impact on Secrets Agent:**
    *   The "Secrets Agent" application, as per its current `THEPLAN.md`, does not require a KEB for its *internal, standalone operations*.
    *   However, by designing Secrets Agent with clear API boundaries and potentially defining events it could emit (e.g., "VaultUpdatedEvent") or consume (e.g., "ConfigurationChangeRequestEvent"), it becomes prepared for seamless integration as a component within the broader VMC-orchestrated Vanta ecosystem. The KEB would be the primary communication channel for such an integration, allowing Secrets Agent to interact with other Vanta agents without direct dependencies.

## Alternatives Considered

1.  **Direct Synchronous Calls between Components:**
    *   *Rejected because:* Leads to tight coupling, reduces system resilience (a failing component can cascade failures), makes independent scaling difficult, and hinders system-wide observability of interactions. This contradicts the "living system" philosophy.

2.  **Other Message Broker Technologies:**
    *   **Apache Kafka:**
        *   *Considered:* Extremely powerful, high-throughput, persistent log.
        *   *Rejected (for now):* Higher operational complexity and resource requirements compared to Redis Streams. Potentially overkill for the initial phases of the Vanta ecosystem. Can be re-evaluated if KEB load grows significantly.
    *   **RabbitMQ:**
        *   *Considered:* Mature, flexible AMQP-based broker with rich routing capabilities.
        *   *Rejected (for now):* Redis Streams provides sufficient functionality for the envisioned event patterns with the advantage of leveraging an already planned data store (Redis for caching).
    *   **Cloud-Specific Queuing Services (e.g., AWS SQS, Google Cloud Pub/Sub):**
        *   *Considered:* Managed services offering scalability and reliability.
        *   *Rejected (for now):* Introduces cloud provider lock-in. A self-hosted or more portable solution like Redis Streams is preferred for broader deployment flexibility initially.

3.  **No Dedicated Event Bus (Relying on direct API calls or shared database for signaling):**
    *   *Rejected because:* This approach suffers from similar drawbacks to direct synchronous calls, especially regarding decoupling, real-time reactivity, and managing complex inter-dependencies in a scalable way. It would make achieving the vision of a dynamic, observable multi-agent system significantly harder.

This ADR establishes Redis Streams as the foundational technology for the KEB, enabling the Vanta AI OS to evolve towards its envisioned architecture.