# Cognite CDF Mapping

This prototype maps local domain objects to [CDF Core Data Model](https://docs.cognite.com/cdf/dm/dm_reference/dm_core_data_model) concepts.

| Local Entity | CDF Concept | Notes |
|--------------|-------------|-------|
| Site / Area / Asset | CogniteAsset | Parent hierarchy via `parent` relation |
| Equipment | CogniteEquipment | `asset` direct relation |
| TimeSeriesSignal | CogniteTimeSeries | Metadata via Instances API; datapoints via Time Series API |
| Batch / CIP / Deviation | CogniteActivity | Domain-specific extension |
| WorkOrder | CogniteMaintenanceOrder | `mainAsset` relation |
| Document / SOP | CogniteFile | `assets` relation |
| Relationships | Direct relations / edges | Graph traversal for copilot tools |
| AI Copilot | Atlas AI Agent | `queryKnowledgeGraph`, `queryTimeSeriesDatapoints`, `askDocument` |
| React App | Flows custom app | Auth via `connectToHostApp()` from `@cognite/app-sdk` |

## Future integration

1. Replace `LocalDataProvider` with `CdfDataProvider` using authenticated Cognite SDK
2. Host app in CDF via Flows; use `connectToHostApp()` for tokens
3. Configure Atlas AI agent against CDF knowledge graph
4. Map batch/deviation to extended CogniteActivity views

See `app/src/adapters/CdfDataProvider.stub.ts` for TODO comments.
