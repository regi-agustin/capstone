import { useState, useMemo } from 'react';
import { Car, CheckCircle2, CircleUserRound, Wrench } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import SummaryCard from '../components/SummaryCard.jsx';
import VehicleTable from '../components/VehicleTable.jsx';
import VehicleDetailsModal from '../components/VehicleDetailsModal.jsx';
import { enrichVehicles, summarizeFleet } from '../services/vehicleService.js';

export default function VehicleAvailability() {
  const { vehicles, bookings, hydrating } = useApp();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [selected, setSelected] = useState(null);

  const fleet = summarizeFleet(vehicles, bookings);

  // Enrich raw vehicles with booking/status info so VehicleTable can render current assignments
  const enrichedVehicles = useMemo(() => enrichVehicles(vehicles, bookings), [vehicles, bookings]);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Vehicle Availability Dashboard</h1>
          <p className="page-head__sub">Monitor fleet status and current vehicle assignments.</p>
        </div>
      </div>

      <div className="stats-grid">
        <SummaryCard icon={<Car size={22} />} label="Total Vehicles" value={fleet.total} tone="primary" note="Full fleet size" />
        <SummaryCard icon={<CheckCircle2 size={22} />} label="Available" value={fleet.available} tone="available" note="Ready for new bookings" />
        <SummaryCard icon={<CircleUserRound size={22} />} label="In Use" value={fleet.inUse} tone="in-use" note="Currently assigned" />
        <SummaryCard icon={<Wrench size={22} />} label="In Maintenance" value={fleet.inMaintenance} tone="in-maintenance" note="Out of service" />
      </div>

      <VehicleTable
        vehicles={enrichedVehicles}
        loading={hydrating}
        search={search}
        onSearchChange={setSearch}
        status={status}
        onStatusChange={setStatus}
        onView={setSelected}
      />

      <VehicleDetailsModal vehicle={selected} open={Boolean(selected)} onClose={() => setSelected(null)} />
    </div>
  );
}