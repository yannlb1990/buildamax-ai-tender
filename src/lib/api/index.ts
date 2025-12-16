// API Layer - Central Export
// Provides unified access to all API functions

// Market Insights API
export {
  // Material Search
  searchMaterials,
  getSuppliersForState,

  // Labour Rates
  getLabourRate,
  getLabourRateDetails,
  getAllLabourRates,
  getLabourRatesByCategory,

  // SOW Rates
  getSOWRateForState,
  getSOWRateDetails,
  getAllSOWRatesList,
  getSOWRatesForTrade,
  getSOWRatesForCategory,
  searchSOWRates,

  // Data Freshness
  getDataFreshnessStatus,
  isAllDataFresh,

  // Types
  type AustralianState,
  type LabourRate,
  type SOWRate,
  type Supplier,
  type StateSuppliers,
  type MaterialSearchResult,
  type MaterialSearchResponse,
  type LabourRateResponse,
  type SOWRateResponse,
  type DataFreshnessStatus,
} from './marketInsights';
