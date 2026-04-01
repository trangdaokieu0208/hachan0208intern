import { createBrowserRouter } from 'react-router';
import { Root } from './pages/Root';
import { Dashboard } from './pages/Dashboard';
import { DataCenters } from './pages/DataCenters';
import { MasterAE } from './pages/MasterAE';
import { Audit } from './pages/Audit';
import { BulkPayment } from './pages/BulkPayment';
import { PivotSheet } from './pages/PivotSheet';
import { CenterDataConfig } from './pages/CenterDataConfig';
import { AEDataConfig } from './pages/AEDataConfig';
import { TimesheetSummary } from './pages/TimesheetSummary';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Root,
    children: [
      { index: true, Component: Dashboard },
      { path: 'centers', Component: DataCenters },
      { path: 'master-ae', Component: MasterAE },
      { path: 'audit', Component: Audit },
      { path: 'payment', Component: BulkPayment },
      { path: 'pivot', Component: PivotSheet },
      { path: 'timesheet-summary', Component: TimesheetSummary },
      { path: 'config/centers', Component: CenterDataConfig },
      { path: 'config/ae', Component: AEDataConfig },
    ],
  },
]);
