/**
 * CdfDataProvider — STUB for future Cognite Data Fusion integration.
 *
 * In production, this provider would replace LocalDataProvider and fetch data
 * from a CDF project using the Cognite SDK and CDM views.
 *
 * Flows integration:
 *   import { connectToHostApp } from "@cognite/app-sdk";
 *   const { api } = await connectToHostApp();
 *   const token = await api.getAccessToken();
 *   const project = await api.getProject();
 *   const baseUrl = await api.getBaseUrl();
 *   // Construct authenticated CogniteClient
 *
 * Atlas AI integration:
 *   The local agent orchestrator (server/agent/orchestrator.ts) would be replaced
 *   by a configured Atlas AI agent with tools like queryKnowledgeGraph,
 *   queryTimeSeriesDatapoints, and askDocument.
 *
 * CDM mapping reference:
 *   Site/Area/Asset     -> CogniteAsset (parent hierarchy via parent relation)
 *   Equipment           -> CogniteEquipment (asset direct relation)
 *   Time series         -> CogniteTimeSeries (assets relation + datapoints API)
 *   Batch/Deviation/CIP -> CogniteActivity (domain extension)
 *   SOP/Documents       -> CogniteFile (assets relation)
 *   Work orders         -> CogniteMaintenanceOrder
 *
 * @see https://docs.cognite.com/cdf/dm/dm_reference/dm_core_data_model
 * @see https://docs.cognite.com/cdf/flows/reference/api/auth
 */

import type { IDataProvider } from "./IDataProvider";
import type {
  Asset,
  Batch,
  Document,
  DocumentFilters,
  Equipment,
  EventFilters,
  ProcessEvent,
  Relationship,
  TimeSeriesPoint,
  TimeSeriesSignal,
  TimeWindow,
  WorkOrder,
  AnomalyWindow,
  Deviation,
  OperatorNote,
} from "../types/domain";

const NOT_IMPLEMENTED =
  "CdfDataProvider is a stub. Connect to a CDF project and implement SDK calls.";

export class CdfDataProvider implements IDataProvider {
  // private client: CogniteClient | null = null;

  async initialize(): Promise<void> {
    // TODO: const { api } = await connectToHostApp();
    // TODO: Build CogniteClient from api.getAccessToken(), getProject(), getBaseUrl()
    throw new Error(NOT_IMPLEMENTED);
  }

  isReady(): boolean {
    return false;
  }

  async listAssets(): Promise<Asset[]> {
    // TODO: client.instances.list({ dataModel: CogniteCore, view: CogniteAsset })
    throw new Error(NOT_IMPLEMENTED);
  }

  async getAsset(_assetId: string): Promise<Asset | undefined> {
    // TODO: client.instances.retrieve({ externalId: assetId, space, view: CogniteAsset })
    throw new Error(NOT_IMPLEMENTED);
  }

  async listEquipment(_assetId?: string): Promise<Equipment[]> {
    // TODO: Filter CogniteEquipment instances by asset direct relation
    throw new Error(NOT_IMPLEMENTED);
  }

  async getEquipment(_equipmentId: string): Promise<Equipment | undefined> {
    throw new Error(NOT_IMPLEMENTED);
  }

  async listBatches(): Promise<Batch[]> {
    // TODO: Query domain-specific Batch view extending CogniteActivity
    throw new Error(NOT_IMPLEMENTED);
  }

  async getBatch(_batchId: string): Promise<Batch | undefined> {
    throw new Error(NOT_IMPLEMENTED);
  }

  async getTimeSeries(
    _batchId: string,
    _signalIds: string[],
    _timeWindow?: TimeWindow
  ): Promise<Record<string, TimeSeriesPoint[]>> {
    // TODO: client.timeSeries.data.retrieve({ externalId, start, end })
    throw new Error(NOT_IMPLEMENTED);
  }

  async listEvents(
    _batchId: string,
    _filters?: EventFilters
  ): Promise<ProcessEvent[]> {
    // TODO: Query CogniteActivity or event stream filtered by batch relation
    throw new Error(NOT_IMPLEMENTED);
  }

  async listWorkOrders(_equipmentOrAssetId?: string): Promise<WorkOrder[]> {
    // TODO: Query CogniteMaintenanceOrder by mainAsset relation
    throw new Error(NOT_IMPLEMENTED);
  }

  async listDocuments(_filters?: DocumentFilters): Promise<Document[]> {
    // TODO: Query CogniteFile instances with asset/batch relations
    throw new Error(NOT_IMPLEMENTED);
  }

  async getDocument(_documentId: string): Promise<Document | undefined> {
    // TODO: Retrieve CogniteFile + download content
    throw new Error(NOT_IMPLEMENTED);
  }

  async searchDocuments(_query: string): Promise<Document[]> {
    // TODO: Use CDF search API on CogniteFile with nested asset filters
    throw new Error(NOT_IMPLEMENTED);
  }

  async getRelationships(_entityId: string): Promise<Relationship[]> {
    // TODO: Traverse direct relations / edges in data model
    throw new Error(NOT_IMPLEMENTED);
  }

  async getAnomalyWindows(_batchId: string): Promise<AnomalyWindow[]> {
    throw new Error(NOT_IMPLEMENTED);
  }

  async getDeviations(_batchId?: string): Promise<Deviation[]> {
    throw new Error(NOT_IMPLEMENTED);
  }

  async getOperatorNotes(_batchId: string): Promise<OperatorNote[]> {
    throw new Error(NOT_IMPLEMENTED);
  }

  async getSignals(_equipmentId?: string): Promise<TimeSeriesSignal[]> {
    throw new Error(NOT_IMPLEMENTED);
  }
}
