import React, { useState } from 'react';
import { 
  LayoutDashboard, FileText, Users, UserCheck, Bell, User, Shield, 
  HelpCircle, LogOut, Search, Plus, Eye, Pencil, Trash2, Download,
  Calendar, CreditCard, CheckCircle, XCircle, Clock, AlertCircle,
  ChevronRight, ChevronDown, Camera, Mail, Phone, MapPin, Lock,
  FileBarChart, Smartphone, MessageSquare, FileQuestion, Filter, Settings, Info,
  Car, UserPlus, History, AlertTriangle
} from 'lucide-react';

// --- MOCK DATA (Fixed for all pages) ---
const payrollRecords = [
  { id: 1, driver: 'Juan Dela Cruz', code: 'CAR-001', plate: 'ABC 1234', period: 'May 1 – 15, 2026', date: 'May 15, 2026', amount: '₱28,450.75', status: 'For Review' },
  { id: 2, driver: 'Pedro Mendoza', code: 'CAR-004', plate: 'DEF 5678', period: 'May 1 – 15, 2026', date: 'May 15, 2026', amount: '₱22,780.50', status: 'Draft' },
  { id: 3, driver: 'Robert Garcia', code: 'CAR-010', plate: 'GHI 9012', period: 'May 1 – 15, 2026', date: 'May 15, 2026', amount: '₱31,200.00', status: 'Verified' },
  { id: 4, driver: 'Michael Reyes', code: 'CAR-007', plate: 'JKL 3456', period: 'May 1 – 15, 2026', date: 'May 15, 2026', amount: '₱26,150.00', status: 'Completed' },
  { id: 5, driver: 'Jose Santos', code: 'CAR-012', plate: 'MNO 7890', period: 'May 1 – 15, 2026', date: 'May 15, 2026', amount: '₱19,850.25', status: 'Draft' },
];

const driverRecords = [
  { id: 1, name: 'Juan Dela Cruz', type: 'Internal Driver', contact: '0912 345 6789', status: 'Active' },
  { id: 2, name: 'Pedro Mendoza', type: 'Subcontracted Driver', contact: '0917 888 1122', status: 'Active' },
  { id: 3, name: 'Robert Garcia', type: 'Internal Driver', contact: '0908 777 3344', status: 'Active' },
  { id: 4, name: 'Michael Reyes', type: 'Subcontracted Driver', contact: '0933 222 5566', status: 'Active' },
  { id: 5, name: 'Jose Santos', type: 'Internal Driver', contact: '0921 654 9870', status: 'Inactive' },
];

const attendanceRecords = [
  { date: 'May 1, 2026 (Fri)', id: 'DRV-001', name: 'Juan Dela Cruz', type: 'Internal Driver', time: '07:58 AM', car: 'CAR-001', entered: 'ABC 1234', extracted: 'ABC 1234', status: 'Verified' },
  { date: 'May 2, 2026 (Sat)', id: 'DRV-002', name: 'Pedro Mendoza', type: 'Subcontracted Driver', time: '08:12 AM', car: 'CAR-004', entered: 'DEF 5678', extracted: 'DEF 5678', status: 'Mismatch' },
  { date: 'May 3, 2026 (Sun)', id: 'DRV-003', name: 'Robert Garcia', type: 'Internal Driver', time: '07:45 AM', car: 'CAR-010', entered: 'ABC 1234', extracted: 'ABC 1234', status: 'Verified' },
  { date: 'May 4, 2026 (Mon)', id: 'DRV-004', name: 'Michael Reyes', type: 'Subcontracted Driver', time: '-', car: '-', entered: '-', extracted: '-', status: 'Absent' },
  { date: 'May 5, 2026 (Tue)', id: 'DRV-005', name: 'Jose Santos', type: 'Internal Driver', time: '07:50 AM', car: 'CAR-007', entered: 'GHI 9012', extracted: 'GHI 9012', status: 'Verified' },
];

const notifications = [
  { type: 'Attendance', icon: 'CheckCircle', title: 'OCR Attendance Verified', msg: 'Juan Dela Cruz (DRV-001) attendance on May 15, 2026 has been verified. Plate: ABC 1234', date: 'May 15, 2026 08:05 AM', priority: 'Low', status: 'Unread' },
  { type: 'Attendance', icon: 'AlertCircle', title: 'OCR Attendance Mismatch', msg: 'Pedro Mendoza (DRV-002) plate number mismatch. Entered: DEF 5678 | OCR: DEF 5678', date: 'May 15, 2026 08:12 AM', priority: 'High', status: 'Unread' },
  { type: 'Attendance', icon: 'XCircle', title: 'Missing Attendance', msg: 'Michael Reyes (DRV-004) has no attendance recorded today.', date: 'May 15, 2026 09:15 AM', priority: 'High', status: 'Unread' },
  { type: 'Payroll', icon: 'Bell', title: 'Cut-off Reminder', msg: 'Payroll cut-off for May 1 – 15, 2026 is on May 15, 2026 8:00 AM.', date: 'May 15, 2026 07:30 AM', priority: 'Medium', status: 'Read' },
];

const carRateRecords = [
  { id: 1, code: 'HD-MPV-001', since: 'since Sep 12, 2026', category: 'MPV', vehicle: 'Toyota Avanza', rate: '₱1,400.00', driver: '', plate: 'GHI 6789', owner: 'Company Owned', status: 'Available' },
  { id: 2, code: 'HD-MPV-002', since: 'since Sep 12, 2026', category: 'MPV', vehicle: 'Toyota Avanza', rate: '₱1,400.00', driver: '', plate: 'JKL 7890', owner: 'Company Owned', status: 'Available' },
  { id: 3, code: 'HD-MPV-003', since: 'since Sep 27, 2026', category: 'MPV', vehicle: 'Toyota Innova', rate: '₱1,500.00', driver: '', plate: 'ABC 1234', owner: 'Company Owned', status: 'Available' },
  { id: 4, code: 'HD-MPV-004', since: 'since Sep 27, 2026', category: 'MPV', vehicle: 'Mitsubishi Xpander', rate: '₱2,500.00', driver: '', plate: 'BCD 2345', owner: 'Company Owned', status: 'Available' },
  { id: 5, code: 'HD-MPV-005', since: '', category: 'MPV', vehicle: 'Toyota Veloz', rate: '₱2,300.00', driver: '', plate: 'CDE 3456', owner: 'Company Owned', status: 'Available' },
  { id: 6, code: 'HD-SUV-006', since: '', category: 'SUV', vehicle: 'Toyota Fortuner', rate: '₱3,800.00', driver: '', plate: 'DEF 4567', owner: 'Company Owned', status: 'Available' },
  { id: 7, code: 'HD-SUV-007', since: '', category: 'SUV', vehicle: 'Mitsubishi Montero', rate: '₱3,600.00', driver: '', plate: 'EFG 5678', owner: 'Company Owned', status: 'Available' },
  { id: 8, code: 'HD-SUV-008', since: '', category: 'SUV', vehicle: 'Honda CR-V', rate: '₱3,500.00', driver: '', plate: 'FGH 6789', owner: 'Company Owned', status: 'Available' },
  { id: 9, code: 'HD-SEDAN-009', since: '', category: 'Sedan', vehicle: 'Toyota Vios', rate: '₱1,700.00', driver: '', plate: 'GHI 7890', owner: 'Company Owned', status: 'Available' },
  { id: 10, code: 'HD-SEDAN-010', since: '', category: 'Sedan', vehicle: 'Honda City', rate: '₱1,800.00', driver: '', plate: 'HIJ 8901', owner: 'Company Owned', status: 'Available' },
  { id: 11, code: 'HD-VAN-011', since: '', category: 'Van', vehicle: 'Toyota Hiace', rate: '₱4,200.00', driver: '', plate: 'IJK 9012', owner: 'Company Owned', status: 'Available' },
  { id: 12, code: 'HD-VAN-012', since: '', category: 'Van', vehicle: 'Hyundai Staria', rate: '₱4,500.00', driver: '', plate: 'JKL 0123', owner: 'Company Owned', status: 'Available' },
  { id: 13, code: 'HD-PU-013', since: '', category: 'Pickup', vehicle: 'Toyota Hilux', rate: '₱3,200.00', driver: '', plate: 'KLM 1234', owner: 'Company Owned', status: 'Available' },
  { id: 14, code: 'HD-MPV-014', since: '', category: 'MPV', vehicle: 'Kia Carnival', rate: '₱4,800.00', driver: '', plate: 'LMN 2345', owner: 'Company Owned', status: 'Available' },
  { id: 15, code: 'HD-SUV-015', since: '', category: 'SUV', vehicle: 'Ford Everest', rate: '₱3,900.00', driver: '', plate: 'MNO 3456', owner: 'Company Owned', status: 'Available' },
];

// --- COMPONENTS ---
const Sidebar = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'payroll', label: 'Payroll Management', icon: FileText },
    { id: 'carrates', label: 'Current Car Rates', icon: Car },
    { id: 'drivers', label: 'Driver Records', icon: Users },
    { id: 'attendance', label: 'Driver Attendance', icon: UserCheck },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: 3 },
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'help', label: 'Help Center', icon: HelpCircle },
  ];

  return (
    <div className="w-64 h-screen bg-white border-r border-gray-200 flex flex-col fixed left-0 top-0 z-20 shadow-sm">
      <div className="p-6 border-b border-gray-100 pb-4 bg-white">
        <div className="text-blue-700 font-bold text-xl tracking-wider flex items-center gap-1">
          <FileBarChart className="text-blue-500" size={24} /> FLEETOPS
        </div>
        <div className="text-[10px] text-gray-500 pl-1">Hollydot Car Rental</div>
      </div>
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 bg-white">
        {menuItems.map((item) => (
          <button key={item.id} onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === item.id ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'text-gray-700 hover:bg-gray-100'
            }`}>
            <div className="flex items-center gap-3">
              <item.icon size={20} />
              <span>{item.label}</span>
            </div>
            {item.badge && (<span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{item.badge}</span>)}
          </button>
        ))}
      </div>
      <div className="p-4 border-t border-gray-100 bg-white">
        <button className="flex items-center gap-3 text-gray-600 hover:text-red-600 text-sm font-medium w-full px-4 py-2 hover:bg-red-50 rounded-lg transition-colors">
          <LogOut size={20} /> <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

const Header = () => (
  <div className="flex items-center justify-between mb-6 pt-6 pb-4 border-b border-gray-200 bg-transparent">
    <div><h1 className="text-2xl font-bold text-gray-800">Good morning, Maria Santos</h1><p className="text-gray-500 text-sm">Payroll Officer</p></div>
    <div className="flex items-center gap-4">
      <button className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full">
        <Bell size={20} />
        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
      </button>
      <div className="flex items-center gap-3 border-l pl-4 border-gray-200 cursor-pointer hover:bg-gray-50 rounded-lg p-1 pr-2 transition-colors">
        <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80" alt="Profile" className="w-10 h-10 rounded-full object-cover" />
        <div className="text-sm hidden md:block"><div className="font-semibold text-gray-800">Maria Santos</div><div className="text-xs text-gray-500">Payroll Officer</div></div>
        <ChevronDown size={16} className="text-gray-400" />
      </div>
    </div>
  </div>
);

// --- PAGE VIEWS ---

const DashboardView = () => (
  <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-200px)] pr-2 pb-10">
    <h3 className="text-lg font-bold text-gray-800">Payroll Overview</h3>
    <div className="grid grid-cols-4 gap-4">
      <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-center gap-4"><div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600"><Calendar size={24} /></div><div><div className="text-xs text-gray-500 font-medium">Current Cut-Off Period</div><div className="font-bold text-gray-800 text-base">May 1 – 15, 2026</div><div className="text-xs text-gray-400">15 days</div></div></div>
      <div className="bg-green-50/50 p-4 rounded-xl border border-green-100 flex items-center gap-4"><div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600"><Users size={24} /></div><div><div className="text-xs text-gray-500 font-medium">Drivers with Payroll Records</div><div className="font-bold text-gray-800 text-2xl">26</div><div className="text-xs text-gray-400">Total Drivers</div></div></div>
      <div className="bg-yellow-50/50 p-4 rounded-xl border border-yellow-100 flex items-center gap-4"><div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600"><FileText size={24} /></div><div><div className="text-xs text-gray-500 font-medium">Payroll Records for Review</div><div className="font-bold text-gray-800 text-2xl">4</div><div className="text-xs text-gray-400">Needs your attention</div></div></div>
      <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100 flex items-center gap-4"><div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600"><CreditCard size={24} /></div><div><div className="text-xs text-gray-500 font-medium">Total Receivable</div><div className="font-bold text-purple-600 text-xl">₱328,450.75</div><div className="text-xs text-gray-400">For this cut-off</div></div></div>
    </div>

    <div className="grid grid-cols-3 gap-6">
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm col-span-1">
        <h4 className="font-semibold text-gray-800 mb-6">Payroll Status</h4>
        <div className="flex items-center justify-between">
          <div className="relative w-28 h-28 rounded-full border-8 border-yellow-400 flex items-center justify-center border-r-blue-500 border-b-green-500 border-l-purple-500">
            <div className="bg-white rounded-full w-16 h-16 flex flex-col items-center justify-center shadow-sm"><span className="text-xl font-bold text-gray-800">26</span><span className="text-[10px] text-gray-500">Total</span></div>
          </div>
          <div className="space-y-3 text-xs flex-1 pl-4">
            <div className="flex justify-between"><span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Draft</span> <span className="text-gray-600">8 (30.77%)</span></div>
            <div className="flex justify-between"><span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span> For Verification</span> <span className="text-gray-600">4 (15.38%)</span></div>
            <div className="flex justify-between"><span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-green-500"></span> Verified</span> <span className="text-gray-600">6 (23.08%)</span></div>
            <div className="flex justify-between"><span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> Completed</span> <span className="text-gray-600">8 (30.77%)</span></div>
          </div>
        </div>
        <div className="mt-4 text-center border-t pt-3 border-gray-100"><a href="#" className="text-blue-600 text-xs font-medium hover:underline inline-flex items-center">View all payroll records <ChevronRight size={14} className="ml-1"/></a></div>
      </div>

      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm col-span-1">
        <h4 className="font-semibold text-gray-800 mb-4">Driver Attendance Summary</h4>
        <div className="space-y-3 text-sm">
           <div className="flex justify-between items-center p-2 rounded hover:bg-gray-50"><span className="flex items-center gap-2 text-green-600"><CheckCircle size={18} className="text-green-500"/> Verified Attendance</span> <span className="text-gray-700 font-medium">18 (69.23%)</span></div>
           <div className="flex justify-between items-center p-2 rounded hover:bg-gray-50"><span className="flex items-center gap-2 text-yellow-500"><Clock size={18} className="text-yellow-500"/> Pending Verification</span> <span className="text-gray-700 font-medium">4 (15.38%)</span></div>
           <div className="flex justify-between items-center p-2 rounded hover:bg-gray-50"><span className="flex items-center gap-2 text-red-500"><XCircle size={18} className="text-red-500"/> Rejected Attendance</span> <span className="text-gray-700 font-medium">2 (7.69%)</span></div>
           <div className="flex justify-between items-center p-2 rounded hover:bg-gray-50"><span className="flex items-center gap-2 text-gray-400"><AlertCircle size={18} className="text-gray-400"/> Missing Records</span> <span className="text-gray-700 font-medium">2 (7.69%)</span></div>
        </div>
        <div className="mt-4 text-center border-t pt-3 border-gray-100"><a href="#" className="text-blue-600 text-xs font-medium hover:underline inline-flex items-center">View attendance records <ChevronRight size={14} className="ml-1"/></a></div>
      </div>

      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm col-span-1">
        <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Calendar size={18} className="text-blue-500"/> Upcoming Reminders</h4>
        <div className="mb-6 pb-6 border-b border-gray-100"><div className="font-semibold text-gray-700 text-sm">Next Cut-Off Period</div><div className="text-blue-600 font-bold text-lg">May 16 – 31, 2026</div><div className="text-xs text-gray-500 mt-1">Starts in 1 day</div></div>
        <div><div className="font-semibold text-gray-700 text-sm">Payroll Due Date</div><div className="text-blue-600 font-bold text-lg">May 20, 2026</div><div className="text-xs text-gray-500 mt-1">5 days left</div></div>
        <div className="mt-6 text-center border-t pt-3 border-gray-100"><a href="#" className="text-blue-600 text-xs font-medium hover:underline inline-flex items-center">View calendar <ChevronRight size={14} className="ml-1"/></a></div>
      </div>
    </div>

    <div className="grid grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm col-span-2">
            <h4 className="font-semibold text-gray-800 mb-4">Recent Activity</h4>
            <div className="space-y-4 text-sm">
                <div className="flex justify-between items-start border-b pb-3 border-gray-100"><div><div className="font-medium text-gray-800 flex items-center gap-2"><FileText size={16} className="text-green-600"/> Payroll record updated</div><div className="text-gray-500">Driver: Juan Dela Cruz (CAR-001) • Cut-off: May 1 – 15, 2026</div></div><div className="text-xs text-gray-400 text-right">Today, 9:15 AM</div></div>
                <div className="flex justify-between items-start border-b pb-3 border-gray-100"><div><div className="font-medium text-gray-800 flex items-center gap-2"><UserCheck size={16} className="text-orange-500"/> Driver attendance verified</div><div className="text-gray-500">Driver: Pedro Mendoza (CAR-004) • Date: May 12, 2026</div></div><div className="text-xs text-gray-400 text-right">Today, 8:42 AM</div></div>
                <div className="flex justify-between items-start border-b pb-3 border-gray-100"><div><div className="font-medium text-gray-800 flex items-center gap-2"><CheckCircle size={16} className="text-purple-500"/> OCR attendance validated</div><div className="text-gray-500">Driver: Robert Garcia (CAR-010) • Plate: ABC 1234</div></div><div className="text-xs text-gray-400 text-right">Yesterday, 5:30 PM</div></div>
                <div className="flex justify-between items-start border-b pb-3 border-gray-100"><div><div className="font-medium text-gray-800 flex items-center gap-2"><FileText size={16} className="text-blue-500"/> Payroll record finalized</div><div className="text-gray-500">Driver: Michael Reyes (CAR-007) • Cut-off: Apr 16 – 30, 2026</div></div><div className="text-xs text-gray-400 text-right">May 14, 2026, 2:18 PM</div></div>
            </div>
            <div className="mt-4 text-center border-t pt-3 border-gray-100"><a href="#" className="text-blue-600 text-xs font-medium hover:underline inline-flex items-center">View all activities <ChevronRight size={14} className="ml-1"/></a></div>
        </div>
        
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm col-span-1">
            <h4 className="font-semibold text-gray-800 mb-4">System Announcements</h4>
            <div className="space-y-4">
                <div className="pb-4 border-b border-gray-100"><div className="font-medium text-gray-800 text-sm flex items-start gap-2"><Bell size={16} className="text-blue-500 mt-0.5"/> System Maintenance Schedule</div><div className="text-xs text-gray-500 mt-1">The system will undergo maintenance on May 18, 2026 from 12:00 AM – 2:00 AM.</div><div className="text-xs text-gray-400 mt-2">May 12, 2026</div></div>
                <div><div className="font-medium text-gray-800 text-sm flex items-start gap-2"><Bell size={16} className="text-blue-500 mt-0.5"/> New Feature Update</div><div className="text-xs text-gray-500 mt-1">Trip breakdown export to Excel is now available in Payroll Management.</div><div className="text-xs text-gray-400 mt-2">May 8, 2026</div></div>
            </div>
            <div className="mt-4 text-center border-t pt-3 border-gray-100"><a href="#" className="text-blue-600 text-xs font-medium hover:underline inline-flex items-center">View all announcements <ChevronRight size={14} className="ml-1"/></a></div>
        </div>
    </div>
  </div>
);

const initialCarRates = [
  { id: 1, date: 'May 01, 2026', carCode: 'CAR-001', rentalRate: '1,800.00', requestedTime: '8:00 AM', timeOut: '5:30 PM', workHours: '9.50', excessKm: '20', excessGas: '200.00', overnightRate: '0.00', otHrs: '1.50', otRate: '150.00', dime: '100.00', hazard: '100.00', toll: '60.00', parking: '50.00', advance: '1,000.00', total: '3,460.00' },
  { id: 2, date: 'May 02, 2026', carCode: 'CAR-014', rentalRate: '1,800.00', requestedTime: '8:30 AM', timeOut: '6:00 PM', workHours: '9.50', excessKm: '30', excessGas: '240.00', overnightRate: '0.00', otHrs: '2.00', otRate: '150.00', dime: '100.00', hazard: '100.00', toll: '80.00', parking: '60.00', advance: '1,000.00', total: '3,680.00' },
  { id: 3, date: 'May 03, 2026', carCode: 'CAR-014', rentalRate: '1,800.00', requestedTime: '7:00 PM', timeOut: '7:00 AM', workHours: '12.00', excessKm: '40', excessGas: '300.00', overnightRate: '800.00', otHrs: '2.50', otRate: '150.00', dime: '100.00', hazard: '100.00', toll: '100.00', parking: '70.00', advance: '1,000.00', total: '4,720.00' },
];

const toNumber = (value) => {
  const parsed = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
  return isNaN(parsed) ? 0 : parsed;
};

const formatAmount = (value) =>
  value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const emptyCarRate = (id) => ({
  id,
  date: '', carCode: '', rentalRate: '', requestedTime: '', timeOut: '', workHours: '',
  excessKm: '', excessGas: '', overnightRate: '', otHrs: '', otRate: '', dime: '',
  hazard: '', toll: '', parking: '', advance: '', total: '',
});

const PayrollView = () => {
  const [carRates, setCarRates] = useState(initialCarRates);

  const addCarRate = () => {
    setCarRates((prev) => [...prev, emptyCarRate(prev.length ? Math.max(...prev.map((r) => r.id)) + 1 : 1)]);
  };

  const deleteCarRate = (id) => {
    setCarRates((prev) => prev.filter((r) => r.id !== id));
  };

  const carRateTotals = carRates.reduce((acc, r) => ({
    rentalRate: acc.rentalRate + toNumber(r.rentalRate),
    workHours: acc.workHours + toNumber(r.workHours),
    excessKm: acc.excessKm + toNumber(r.excessKm),
    excessGas: acc.excessGas + toNumber(r.excessGas),
    overnightRate: acc.overnightRate + toNumber(r.overnightRate),
    otHrs: acc.otHrs + toNumber(r.otHrs),
    otRate: acc.otRate + toNumber(r.otRate),
    dime: acc.dime + toNumber(r.dime),
    hazard: acc.hazard + toNumber(r.hazard),
    toll: acc.toll + toNumber(r.toll),
    parking: acc.parking + toNumber(r.parking),
    advance: acc.advance + toNumber(r.advance),
    total: acc.total + toNumber(r.total),
  }), { rentalRate: 0, workHours: 0, excessKm: 0, excessGas: 0, overnightRate: 0, otHrs: 0, otRate: 0, dime: 0, hazard: 0, toll: 0, parking: 0, advance: 0, total: 0 });

  return (
  <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-200px)] pr-2 pb-10">
    <h2 className="text-xl font-bold text-gray-800">Payroll Management</h2>
    <p className="text-sm text-gray-500 -mt-4">Create, encode, review and verify driver payroll records.</p>
    
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Payroll Records</h3>
      <div className="flex items-center gap-3 flex-wrap">
         <div className="border rounded-lg px-3 py-2 text-sm text-gray-600 flex items-center gap-2 bg-white">
           Cut-off Period <span className="font-medium text-gray-800">May 1 – 15, 2026</span>
         </div>
         <div className="relative">
           <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
           <input type="text" placeholder="Search driver..." className="pl-9 pr-4 py-2 border rounded-lg text-sm w-48 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
         </div>
         <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 flex items-center gap-2 bg-white hover:bg-gray-50"><Download size={16} /> Export</button>
         <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-700"><Plus size={16} /> New Payroll Record</button>
      </div>
    </div>

    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
          <tr><th className="px-6 py-3">#</th><th className="px-6 py-3">Driver</th><th className="px-6 py-3">Car Code</th><th className="px-6 py-3">Plate Number</th><th className="px-6 py-3">Cut-Off</th><th className="px-6 py-3">Payroll Date</th><th className="px-6 py-3">Total Receivable</th><th className="px-6 py-3">Status</th><th className="px-6 py-3 text-center">Actions</th></tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {payrollRecords.map((record, idx) => (
            <tr key={record.id} className="hover:bg-blue-50/30 transition-colors">
              <td className="px-6 py-4 text-gray-600">{idx + 1}</td>
              <td className="px-6 py-4 font-medium text-gray-800">{record.driver}</td>
              <td className="px-6 py-4 text-gray-600">{record.code}</td>
              <td className="px-6 py-4 text-gray-600">{record.plate}</td>
              <td className="px-6 py-4 text-gray-600">{record.period}</td>
              <td className="px-6 py-4 text-gray-600">{record.date}</td>
              <td className="px-6 py-4 font-bold text-gray-800">{record.amount}</td>
              <td className="px-6 py-4">
                <span className={`px-3 py-1 rounded-full text-[11px] font-medium ${record.status === 'Verified' ? 'bg-green-100 text-green-700' : record.status === 'Completed' ? 'bg-blue-100 text-blue-700' : record.status === 'Draft' ? 'bg-gray-100 text-gray-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {record.status}
                </span>
              </td>
              <td className="px-6 py-4"><div className="flex justify-center gap-3 text-blue-500"><button className="hover:text-blue-700"><Eye size={16}/></button><button className="hover:text-blue-700"><Pencil size={16}/></button><button className="hover:text-red-600"><Trash2 size={16}/></button></div></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center text-sm text-gray-500 bg-white"><span>Showing 1 to 5 of 26 records</span>
        <div className="flex items-center gap-2"><button className="p-1 border rounded hover:bg-gray-50 text-gray-400"><ChevronRight size={16} className="rotate-180"/></button><button className="px-3 py-1 border rounded bg-blue-600 text-white text-xs font-medium">1</button><button className="px-3 py-1 border rounded hover:bg-gray-50 text-xs">2</button><button className="px-3 py-1 border rounded hover:bg-gray-50 text-xs">3</button><button className="p-1 border rounded hover:bg-gray-50"><ChevronRight size={16}/></button><select className="ml-2 border rounded px-2 py-1 text-xs bg-white"><option>5 / page</option></select></div>
      </div>
    </div>
    
    {/* FULL DETAILED FORM (Corrected to match exact image) */}
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-8">
      
      {/* A. HEADER */}
      <div>
        <h4 className="text-sm font-bold text-gray-800 bg-blue-50/50 p-2 rounded-t border border-b-0 border-blue-200 -mx-6 px-6 mb-4">A. HEADER <span className="font-normal text-xs text-gray-500 font-light">(input manually)</span></h4>
        <div className="grid grid-cols-3 gap-x-8 gap-y-4 text-sm px-2">
            <div><label className="block text-xs text-gray-500 mb-1">Plate Number <span className="text-red-500">*</span></label><input type="text" defaultValue="ABC 1234" className="w-full border rounded px-3 py-2 bg-gray-50 text-gray-600"/></div>
            <div><label className="block text-xs text-gray-500 mb-1">Car Owner <span className="text-red-500">*</span></label><input type="text" defaultValue="Juan Dela Cruz" className="w-full border rounded px-3 py-2 bg-gray-50 text-gray-600"/></div>
            <div><label className="block text-xs text-gray-500 mb-1">Vehicle Type <span className="text-red-500">*</span></label><input type="text" defaultValue="Toyota Innova" className="w-full border rounded px-3 py-2 bg-gray-50 text-gray-600"/></div>
            
            <div><label className="block text-xs text-gray-500 mb-1">Car Code <span className="text-red-500">*</span></label><input type="text" defaultValue="CAR-001" className="w-full border rounded px-3 py-2 bg-gray-50 text-gray-600"/></div>
            <div><label className="block text-xs text-gray-500 mb-1">Car Driver <span className="text-red-500">*</span></label><input type="text" defaultValue="Juan Dela Cruz" className="w-full border rounded px-3 py-2 bg-gray-50 text-gray-600"/></div>
            <div></div>

            <div><label className="block text-xs text-gray-500 mb-1">Payroll Date <span className="text-red-500">*</span></label><input type="text" defaultValue="May 15, 2026" className="w-full border rounded px-3 py-2 bg-gray-50 text-gray-600"/></div>
            <div><label className="block text-xs text-gray-500 mb-1">Cut-off Period <span className="text-red-500">*</span></label><input type="text" defaultValue="May 1 – 15, 2026" className="w-full border rounded px-3 py-2 bg-gray-50 text-gray-600"/></div>
            <div><label className="block text-xs text-gray-500 mb-1">Amount Paid</label><input type="text" defaultValue="₱20,000.00" className="w-full border rounded px-3 py-2 bg-gray-50 text-gray-600"/></div>

            <div><label className="block text-xs text-gray-500 mb-1">Total Receivable</label><input type="text" defaultValue="₱328,450.75" className="w-full border rounded px-3 py-2 bg-gray-50 text-gray-600"/></div>
            <div></div>
            <div><label className="block text-xs text-gray-500 mb-1">Date Paid</label><input type="text" defaultValue="May 14, 2026" className="w-full border rounded px-3 py-2 bg-gray-50 text-gray-600"/></div>
        </div>
      </div>

      {/* B. EARNINGS & C. DEDUCTIONS (Side by Side) */}
      <div className="grid grid-cols-2 gap-8">
        <div className="bg-green-50/30 p-4 rounded-xl border border-green-200">
            <h4 className="font-bold text-gray-800 text-sm mb-4 border-b border-green-200 pb-2">B. EARNINGS <span className="font-normal text-xs text-gray-500 font-light">(input manually)</span></h4>
            <div className="space-y-2 text-sm border-b border-green-200 pb-4">
                <div className="flex justify-between"><span className="text-gray-600">1 Car Rental Payment</span><span className="font-medium">23,500.00</span></div>
                <div className="flex justify-between"><span className="text-gray-600">2 Fuel Subsidy</span><span className="font-medium">2,000.00</span></div>
                <div className="flex justify-between"><span className="text-gray-600">3 Excess Gas</span><span className="font-medium">1,200.00</span></div>
                <div className="flex justify-between"><span className="text-gray-600">4 Overnight Allowance</span><span className="font-medium">900.00</span></div>
                <div className="flex justify-between"><span className="text-gray-600">5 Overtime</span><span className="font-medium">1,750.00</span></div>
                <div className="flex justify-between"><span className="text-gray-600">6 Total Miscellaneous Charges</span><span className="font-medium">2,600.00</span></div>
                <div className="flex justify-between"><span className="text-gray-600">7 Dime and Hazard Pay</span><span className="font-medium">800.00</span></div>
                <div className="flex justify-between"><span className="text-gray-600">8 Dispute</span><span className="font-medium text-red-500">-300.00</span></div>
            </div>
            <div className="flex justify-between mt-3 font-bold text-green-700"><span>TOTAL EARNINGS</span><span>32,450.00</span></div>
        </div>

        <div className="bg-red-50/30 p-4 rounded-xl border border-red-200">
            <h4 className="font-bold text-gray-800 text-sm mb-4 border-b border-red-200 pb-2">C. DEDUCTIONS <span className="font-normal text-xs text-gray-500 font-light">(input manually)</span></h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm border-b border-red-200 pb-4">
                <div className="flex justify-between"><span className="text-gray-600">9 Cash Advance</span><span className="font-medium">5,000.00</span></div>
                <div className="flex justify-between"><span className="text-gray-600">15 Cash Bond</span><span className="font-medium">0.00</span></div>
                <div className="flex justify-between"><span className="text-gray-600">10 Penalty</span><span className="font-medium">500.00</span></div>
                <div className="flex justify-between"><span className="text-gray-600">16 Others</span><span className="font-medium">100.00</span></div>
                <div className="flex justify-between"><span className="text-gray-600">11 Excess Cooling</span><span className="font-medium">300.00</span></div>
                <div className="flex justify-between"><span className="text-gray-600">17 Coop Savings</span><span className="font-medium">200.00</span></div>
                <div className="flex justify-between"><span className="text-gray-600">12 Absent/Leave</span><span className="font-medium">0.00</span></div>
                <div className="flex justify-between"><span className="text-gray-600">18 Coop Loan</span><span className="font-medium">1,447.25</span></div>
                <div className="flex justify-between"><span className="text-gray-600">13 Less 2% WTAX on Misc. Charges</span><span className="font-medium">52.00</span></div>
                <div className="flex justify-between col-span-2"><span className="text-gray-600">14 Membership</span><span className="font-medium">200.00</span></div>
            </div>
            <div className="flex justify-between mt-3 font-bold text-red-600"><span>TOTAL DEDUCTIONS</span><span>8,450.25</span></div>
        </div>
      </div>

      {/* D. TRIP BREAKDOWN (MASSIVE TABLE) */}
      <div>
        <div className="flex items-center justify-between gap-4">
          <h4 className="text-sm font-bold text-gray-800 bg-blue-50/50 p-2 rounded-t border border-b-0 border-blue-200 -mx-6 px-6 mb-4 flex-1">D. TRIP BREAKDOWN <span className="font-normal text-xs text-gray-500 font-light">(input manually per trip)</span></h4>
          <button onClick={addCarRate} className="mb-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-700"><Plus size={16} /> Add</button>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-[11px] text-left border-collapse">
                <thead className="bg-blue-50/50 text-gray-600 font-semibold border-b border-gray-200">
                    <tr>
                        <th className="p-2 border-r border-gray-200">#</th><th className="p-2 border-r border-gray-200">Date</th><th className="p-2 border-r border-gray-200">Car Code</th>
                        <th className="p-2 border-r border-gray-200">Rental Rate (₱)</th><th className="p-2 border-r border-gray-200">Requested Time</th><th className="p-2 border-r border-gray-200">Time Out</th>
                        <th className="p-2 border-r border-gray-200">Work Hours</th><th className="p-2 border-r border-gray-200">Excess KM</th><th className="p-2 border-r border-gray-200">Excess Gas (₱)</th>
                        <th className="p-2 border-r border-gray-200">Overnight Rate (₱)</th><th className="p-2 border-r border-gray-200">OT Hrs</th><th className="p-2 border-r border-gray-200">OT Rate (₱)</th>
                        <th className="p-2 border-r border-gray-200">Dime (₱)</th><th className="p-2 border-r border-gray-200">Hazard (₱)</th><th className="p-2 border-r border-gray-200">Toll (₱)</th>
                        <th className="p-2 border-r border-gray-200">Parking (₱)</th><th className="p-2 border-r border-gray-200">Advance (₱)</th><th className="p-2 border-r border-gray-200">Total Amount (₱)</th><th className="p-2 text-center">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {carRates.map((car, idx) => (
                        <tr key={car.id} className="hover:bg-gray-50">
                            <td className="p-2 border-r border-gray-200 text-center">{idx + 1}</td><td className="p-2 border-r border-gray-200">{car.date}</td><td className="p-2 border-r border-gray-200">{car.carCode}</td>
                            <td className="p-2 border-r border-gray-200">{car.rentalRate}</td><td className="p-2 border-r border-gray-200">{car.requestedTime}</td><td className="p-2 border-r border-gray-200">{car.timeOut}</td>
                            <td className="p-2 border-r border-gray-200">{car.workHours}</td><td className="p-2 border-r border-gray-200">{car.excessKm}</td><td className="p-2 border-r border-gray-200">{car.excessGas}</td>
                            <td className="p-2 border-r border-gray-200">{car.overnightRate}</td><td className="p-2 border-r border-gray-200">{car.otHrs}</td><td className="p-2 border-r border-gray-200">{car.otRate}</td>
                            <td className="p-2 border-r border-gray-200">{car.dime}</td><td className="p-2 border-r border-gray-200">{car.hazard}</td><td className="p-2 border-r border-gray-200">{car.toll}</td>
                            <td className="p-2 border-r border-gray-200">{car.parking}</td><td className="p-2 border-r border-gray-200">{car.advance}</td><td className="p-2 border-r border-gray-200 font-bold">{car.total}</td>
                            <td className="p-2 text-center text-red-500">
                                <button onClick={() => deleteCarRate(car.id)} title="Delete car record" className="hover:text-red-700"><Trash2 size={14}/></button>
                            </td>
                        </tr>
                    ))}
                    {carRates.length === 0 && (
                        <tr><td colSpan={19} className="p-6 text-center text-gray-400">No car records yet. Click Add to create one.</td></tr>
                    )}
                    <tr className="bg-gray-50 border-t-2 border-gray-200">
                        <td className="p-2 font-bold text-right pr-4" colSpan={3}>TOTAL</td>
                        <td className="p-2 font-bold border-r border-gray-200 text-right">{formatAmount(carRateTotals.rentalRate)}</td><td className="p-2 border-r border-gray-200"></td><td className="p-2 border-r border-gray-200"></td>
                        <td className="p-2 font-bold border-r border-gray-200 text-right">{formatAmount(carRateTotals.workHours)}</td><td className="p-2 font-bold border-r border-gray-200 text-right">{formatAmount(carRateTotals.excessKm)}</td><td className="p-2 font-bold border-r border-gray-200 text-right">{formatAmount(carRateTotals.excessGas)}</td>
                        <td className="p-2 font-bold border-r border-gray-200 text-right">{formatAmount(carRateTotals.overnightRate)}</td><td className="p-2 font-bold border-r border-gray-200 text-right">{formatAmount(carRateTotals.otHrs)}</td><td className="p-2 font-bold border-r border-gray-200 text-right">{formatAmount(carRateTotals.otRate)}</td>
                        <td className="p-2 font-bold border-r border-gray-200 text-right">{formatAmount(carRateTotals.dime)}</td><td className="p-2 font-bold border-r border-gray-200 text-right">{formatAmount(carRateTotals.hazard)}</td><td className="p-2 font-bold border-r border-gray-200 text-right">{formatAmount(carRateTotals.toll)}</td>
                        <td className="p-2 font-bold border-r border-gray-200 text-right">{formatAmount(carRateTotals.parking)}</td><td className="p-2 font-bold border-r border-gray-200 text-right">{formatAmount(carRateTotals.advance)}</td><td className="p-2 font-bold border-r border-gray-200 text-right">{formatAmount(carRateTotals.total)}</td>
                        <td className="p-2 text-center"></td>
                    </tr>
                </tbody>
            </table>
        </div>
      </div>

      {/* E. MISCELLANEOUS CHARGES */}
      <div>
        <h4 className="text-sm font-bold text-gray-800 bg-purple-50/50 p-2 rounded-t border border-b-0 border-purple-200 -mx-6 px-6 mb-4">E. MISCELLANEOUS CHARGES <span className="font-normal text-xs text-gray-500 font-light">(input manually)</span></h4>
        <div className="grid grid-cols-7 gap-4 text-sm px-2">
            <div><label className="block text-xs text-gray-500 mb-1">Excess Gas (₱)</label><input type="text" defaultValue="740.00" className="w-full border rounded px-3 py-2 bg-gray-50 text-gray-600"/></div>
            <div><label className="block text-xs text-gray-500 mb-1">Overnight Allowance (₱)</label><input type="text" defaultValue="800.00" className="w-full border rounded px-3 py-2 bg-gray-50 text-gray-600"/></div>
            <div><label className="block text-xs text-gray-500 mb-1">Overtime (₱)</label><input type="text" defaultValue="1,750.00" className="w-full border rounded px-3 py-2 bg-gray-50 text-gray-600"/></div>
            <div><label className="block text-xs text-gray-500 mb-1">Toll (₱)</label><input type="text" defaultValue="240.00" className="w-full border rounded px-3 py-2 bg-gray-50 text-gray-600"/></div>
            <div><label className="block text-xs text-gray-500 mb-1">Parking (₱)</label><input type="text" defaultValue="180.00" className="w-full border rounded px-3 py-2 bg-gray-50 text-gray-600"/></div>
            <div><label className="block text-xs text-gray-500 mb-1">Total Gross (₱)</label><input type="text" defaultValue="3,710.00" className="w-full border rounded px-3 py-2 bg-gray-50 text-gray-600"/></div>
            <div><label className="block text-xs text-gray-500 mb-1">Less 2% WTAX (₱)</label><input type="text" defaultValue="74.20" className="w-full border rounded px-3 py-2 bg-gray-50 text-gray-600"/></div>
        </div>
        <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200 text-right">
            <span className="text-xs text-gray-600 font-medium mr-4">TOTAL MISC. CHARGES (₱)</span>
            <span className="text-xl font-bold text-purple-700">3,635.80</span>
        </div>
      </div>

      {/* BOTTOM ACTION BUTTONS */}
      <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 mt-4">
          <button className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 flex items-center gap-2 hover:bg-gray-50">Cancel</button>
          <button className="px-6 py-2.5 border border-blue-600 text-blue-600 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-50"><FileText size={16}/> Save as Draft</button>
          <button className="px-6 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-green-700"><CheckCircle size={16}/> Verify Record</button>
          <button className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-700"><FileText size={16}/> Finalize Record</button>
          <button className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 flex items-center gap-2 hover:bg-gray-50"><Download size={16}/> Print / Export</button>
      </div>

    </div>
  </div>
  );
};

const DriversView = () => (
  <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-200px)] pr-2 pb-10">
    <h2 className="text-xl font-bold text-gray-800">Driver Records</h2>
    <p className="text-sm text-gray-500 -mt-4">View and manage driver information and their payroll history.</p>
    
    {/* Top Controls Row */}
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div className="flex items-center gap-4 flex-1 flex-wrap">
         <div className="relative flex-1 max-w-sm bg-white"><Search className="absolute left-3 top-2.5 text-gray-400" size={16} /><input type="text" placeholder="Search driver name or ID..." className="pl-9 pr-4 py-2 border rounded-lg text-sm w-full focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
         <select className="px-3 py-2 border rounded-lg text-sm text-gray-600 bg-white"><option>Driver Type</option><option>All Types</option></select>
         <select className="px-3 py-2 border rounded-lg text-sm text-gray-600 bg-white"><option>Status</option><option>All Status</option></select>
         <select className="px-3 py-2 border rounded-lg text-sm text-gray-600 bg-white"><option>Sort by</option><option>Driver Name (A-Z)</option></select>
      </div>
      <div className="flex gap-3">
         <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 flex items-center gap-2 bg-white hover:bg-gray-50"><Download size={16}/> Export</button>
         <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-700"><Plus size={16}/> Add Driver</button>
      </div>
    </div>

    {/* Main Table */}
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
          <tr><th className="px-6 py-3">#</th><th className="px-6 py-3">Driver ID</th><th className="px-6 py-3">Driver Name</th><th className="px-6 py-3">Driver Type</th><th className="px-6 py-3">Contact Number</th><th className="px-6 py-3">Status</th><th className="px-6 py-3 text-center">Actions</th></tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {driverRecords.map((d, idx) => (
            <tr key={d.id} className="hover:bg-blue-50/30 transition-colors">
              <td className="px-6 py-4 text-gray-600">{idx + 1}</td>
              <td className="px-6 py-4 font-mono text-xs text-gray-500">DRV-00{idx+1}</td>
              <td className="px-6 py-4 font-medium text-gray-800">{d.name}</td>
              <td className="px-6 py-4 text-gray-600">{d.type}</td>
              <td className="px-6 py-4 text-gray-600">{d.contact}</td>
              <td className="px-6 py-4"><span className={`px-3 py-1 rounded-full text-[11px] font-medium ${d.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{d.status}</span></td>
              <td className="px-6 py-4"><div className="flex justify-center gap-3 text-blue-500"><button className="hover:text-blue-700"><Eye size={16}/></button><button className="hover:text-blue-700"><Pencil size={16}/></button><button className="hover:text-red-600"><Trash2 size={16}/></button></div></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center text-sm text-gray-500 bg-white"><span>Showing 1 to 5 of 26 records</span>
        <div className="flex items-center gap-2">
          <button className="p-1 border rounded hover:bg-gray-50 text-gray-400"><ChevronRight size={16} className="rotate-180"/></button>
          <button className="px-3 py-1 border rounded bg-blue-600 text-white text-xs font-medium">1</button>
          <button className="px-3 py-1 border rounded hover:bg-gray-50 text-xs">2</button>
          <button className="px-3 py-1 border rounded hover:bg-gray-50 text-xs">3</button>
          <button className="px-3 py-1 border rounded hover:bg-gray-50 text-xs">4</button>
          <button className="px-3 py-1 border rounded hover:bg-gray-50 text-xs">5</button>
          <button className="p-1 border rounded hover:bg-gray-50"><ChevronRight size={16}/></button>
          <select className="ml-2 border rounded px-2 py-1 text-xs bg-white"><option>5 / page</option></select>
        </div>
      </div>
    </div>

    {/* Expanded Profile Card */}
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {/* Top Profile Header */}
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex gap-6">
                <div className="w-20 h-20 bg-blue-50 rounded-full border border-blue-100 flex items-center justify-center shrink-0">
                   <Users size={40} className="text-blue-600"/>
                </div>
                <div>
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-3">Juan Dela Cruz <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-medium">Active</span></h3>
                    <p className="text-sm text-gray-500">Driver ID: DRV-001 <span className="mx-2 text-gray-300">|</span> Internal Driver</p>
                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                        <p className="flex items-center gap-2"><Phone size={14} className="text-gray-400"/> 0912 345 6789</p>
                        <p className="flex items-center gap-2"><Mail size={14} className="text-gray-400"/> juan.delacruz@example.com</p>
                        <p className="flex items-center gap-2"><MapPin size={14} className="text-gray-400"/> Purok 3, Brgy. San Isidro, Clark Freeport Zone, Pampanga</p>
                    </div>
                </div>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
                <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50"><Pencil size={16}/> Edit Driver</button>
                <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"><Users size={16}/> Print Profile</button>
            </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6 flex gap-8">
            <button className="py-4 border-b-2 border-blue-600 text-blue-600 font-medium text-sm">Overview</button>
            <button className="py-4 text-gray-500 hover:text-gray-800 font-medium text-sm">Payroll History</button>
            <button className="py-4 text-gray-500 hover:text-gray-800 font-medium text-sm">Trip History</button>
        </div>

        {/* 4-Column Information Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 bg-gray-50/30">
            {/* Column 1: Personal Information */}
            <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                <h4 className="font-bold text-gray-800 text-sm mb-3">Personal Information</h4>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between border-b border-gray-50 pb-1"><span className="text-gray-500">Full Name</span><span className="font-medium text-gray-800 text-right">Juan Dela Cruz</span></div>
                    <div className="flex justify-between border-b border-gray-50 pb-1"><span className="text-gray-500">Date of Birth</span><span className="font-medium text-gray-800 text-right">May 12, 1988</span></div>
                    <div className="flex justify-between border-b border-gray-50 pb-1"><span className="text-gray-500">Gender</span><span className="font-medium text-gray-800 text-right">Male</span></div>
                    <div className="flex justify-between border-b border-gray-50 pb-1"><span className="text-gray-500">Civil Status</span><span className="font-medium text-gray-800 text-right">Married</span></div>
                    <div className="flex justify-between border-b border-gray-50 pb-1"><span className="text-gray-500">Address</span><span className="font-medium text-gray-800 text-right text-xs">Purok 3, Brgy. San Isidro, Clark Freeport Zone, Pampanga</span></div>
                </div>
            </div>

            {/* Column 2: Driver Information */}
            <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                <h4 className="font-bold text-gray-800 text-sm mb-3">Driver Information</h4>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between border-b border-gray-50 pb-1"><span className="text-gray-500">Driver Type</span><span className="font-medium text-gray-800">Internal Driver</span></div>
                    <div className="flex justify-between border-b border-gray-50 pb-1"><span className="text-gray-500">License Number</span><span className="font-medium text-gray-800">N72-34-567890</span></div>
                    <div className="flex justify-between border-b border-gray-50 pb-1"><span className="text-gray-500">License Expiry</span><span className="font-medium text-gray-800">May 15, 2028</span></div>
                    <div className="flex justify-between border-b border-gray-50 pb-1"><span className="text-gray-500">Date Hired</span><span className="font-medium text-gray-800">April 10, 2023</span></div>
                    <div className="flex justify-between border-b border-gray-50 pb-1"><span className="text-gray-500">Employment Status</span><span className="font-medium text-gray-800">Active</span></div>
                    <div className="flex justify-between border-b border-gray-50 pb-1"><span className="text-gray-500">Remarks</span><span className="font-medium text-gray-800">-</span></div>
                </div>
            </div>

            {/* Column 3: Contact Information */}
            <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                <h4 className="font-bold text-gray-800 text-sm mb-3">Contact Information</h4>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between border-b border-gray-50 pb-1"><span className="text-gray-500">Contact Number</span><span className="font-medium text-gray-800">0912 345 6789</span></div>
                    <div className="flex justify-between border-b border-gray-50 pb-1"><span className="text-gray-500">Email Address</span><span className="font-medium text-gray-800 text-xs break-all">juan.delacruz@example.com</span></div>
                    <div className="flex justify-between border-b border-gray-50 pb-1"><span className="text-gray-500">Emergency Contact</span><span className="font-medium text-gray-800">Maria Dela Cruz (Wife)</span></div>
                    <div className="flex justify-between border-b border-gray-50 pb-1"><span className="text-gray-500">Emergency Contact No.</span><span className="font-medium text-gray-800">0917 123 4567</span></div>
                </div>
            </div>

            {/* Column 4: Payroll Summary */}
            <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                <h4 className="font-bold text-gray-800 text-sm mb-3">Payroll Summary <span className="font-normal text-xs text-gray-400">(Current Cut-off)</span></h4>
                <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                    <div className="flex justify-between text-xs py-1"><span className="text-gray-500">Cut-off Period</span><span className="font-medium text-gray-800">May 1 – 15, 2026</span></div>
                    <div className="flex justify-between text-xs py-1"><span className="text-gray-500">Total Earnings</span><span className="font-bold text-gray-800">₱32,450.00</span></div>
                    <div className="flex justify-between text-xs py-1"><span className="text-gray-500">Total Deductions</span><span className="font-bold text-red-600">₱8,499.25</span></div>
                    <div className="flex justify-between text-xs py-1 border-t border-blue-200 mt-1 pt-1"><span className="text-gray-500 font-medium">Total Receivable</span><span className="font-bold text-blue-600">₱23,950.75</span></div>
                    <div className="flex justify-between text-xs py-1"><span className="text-gray-500">Status</span><span className="text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full text-[10px] font-medium">For Review</span></div>
                </div>
            </div>
        </div>

        {/* Bottom Section: History Tables (Stacked Vertically) */}
        <div className="border-t border-gray-200 p-6 space-y-8">
            
            {/* 1. Recent Payroll History */}
            <div>
                <h4 className="font-medium text-gray-800 text-sm mb-4">Recent Payroll History</h4>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-[11px] text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                            <tr><th className="px-3 py-2">Cut-off Period</th><th className="px-3 py-2">Payroll Date</th><th className="px-3 py-2 text-right">Total Earnings</th><th className="px-3 py-2 text-right">Total Deductions</th><th className="px-3 py-2 text-right">Total Receivable</th><th className="px-3 py-2 text-center">Status</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            <tr className="hover:bg-gray-50"><td className="px-3 py-2">May 1 – 15, 2026</td><td className="px-3 py-2">May 15, 2026</td><td className="px-3 py-2 text-right font-medium">₱32,450.00</td><td className="px-3 py-2 text-right font-medium">₱8,499.25</td><td className="px-3 py-2 text-right font-bold text-blue-600">₱23,950.75</td><td className="px-3 py-2 text-center"><span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">For Review</span></td></tr>
                            <tr className="hover:bg-gray-50"><td className="px-3 py-2">Apr 16 – 30, 2026</td><td className="px-3 py-2">Apr 30, 2026</td><td className="px-3 py-2 text-right font-medium">₱30,200.00</td><td className="px-3 py-2 text-right font-medium">₱7,880.00</td><td className="px-3 py-2 text-right font-bold text-blue-600">₱22,320.00</td><td className="px-3 py-2 text-center"><span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Completed</span></td></tr>
                            <tr className="hover:bg-gray-50"><td className="px-3 py-2">Apr 1 – 15, 2026</td><td className="px-3 py-2">Apr 15, 2026</td><td className="px-3 py-2 text-right font-medium">₱31,150.00</td><td className="px-3 py-2 text-right font-medium">₱8,150.00</td><td className="px-3 py-2 text-right font-bold text-blue-600">₱23,000.00</td><td className="px-3 py-2 text-center"><span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Completed</span></td></tr>
                        </tbody>
                    </table>
                </div>
                <div className="mt-3 text-center">
                    <a href="#" className="text-blue-600 text-xs font-medium hover:underline inline-flex items-center">View all payroll history <ChevronRight size={14} className="ml-1"/></a>
                </div>
            </div>

            {/* 2. Recent Trip History (Moved below and widened to fix column cutoff) */}
            <div>
                <h4 className="font-medium text-gray-800 text-sm mb-4">Recent Trip History <span className="font-normal text-xs text-gray-400">(This shows trips used for payroll computation)</span></h4>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-[11px] text-left">
                            <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200 whitespace-nowrap">
                                <tr>
                                    <th className="px-3 py-2 text-center">Date</th>
                                    <th className="px-3 py-2 text-center">Car Code</th>
                                    <th className="px-3 py-2 text-right">Rental Rate (₱)</th>
                                    <th className="px-3 py-2 text-center">Requested Time</th>
                                    <th className="px-3 py-2 text-center">Time Out</th>
                                    <th className="px-3 py-2 text-right">Work Hours</th>
                                    <th className="px-3 py-2 text-right">Excess KM</th>
                                    <th className="px-3 py-2 text-right">Excess Gas (₱)</th>
                                    <th className="px-3 py-2 text-right">Overnight Rate (₱)</th>
                                    <th className="px-3 py-2 text-right">OT Hrs</th>
                                    <th className="px-3 py-2 text-right">OT Rate (₱)</th>
                                    <th className="px-3 py-2 text-right">Dime (₱)</th>
                                    <th className="px-3 py-2 text-right">Hazard (₱)</th>
                                    <th className="px-3 py-2 text-right">Toll (₱)</th>
                                    <th className="px-3 py-2 text-right">Parking (₱)</th>
                                    <th className="px-3 py-2 text-right">Advance (₱)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white whitespace-nowrap">
                                <tr className="hover:bg-gray-50">
                                    <td className="px-3 py-2 text-center text-gray-700">May 15, 2026</td>
                                    <td className="px-3 py-2 text-center font-medium text-gray-800">CAR-001</td>
                                    <td className="px-3 py-2 text-right text-gray-700">₱1,800.00</td>
                                    <td className="px-3 py-2 text-center text-gray-700">08:00 AM</td>
                                    <td className="px-3 py-2 text-center text-gray-700">05:30 PM</td>
                                    <td className="px-3 py-2 text-right text-gray-700">9.50</td>
                                    <td className="px-3 py-2 text-right text-gray-700">20</td>
                                    <td className="px-3 py-2 text-right text-gray-700">₱200.00</td>
                                    <td className="px-3 py-2 text-right text-gray-700">₱0.00</td>
                                    <td className="px-3 py-2 text-right text-gray-700">1.50</td>
                                    <td className="px-3 py-2 text-right text-gray-700">₱150.00</td>
                                    <td className="px-3 py-2 text-right text-gray-700">₱100.00</td>
                                    <td className="px-3 py-2 text-right text-gray-700">₱50.00</td>
                                    <td className="px-3 py-2 text-right text-gray-700">₱60.00</td>
                                    <td className="px-3 py-2 text-right text-gray-700">₱50.00</td>
                                    <td className="px-3 py-2 text-right text-gray-700">₱500.00</td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                    <td className="px-3 py-2 text-center text-gray-700">May 14, 2026</td>
                                    <td className="px-3 py-2 text-center font-medium text-gray-800">CAR-014</td>
                                    <td className="px-3 py-2 text-right text-gray-700">₱1,800.00</td>
                                    <td className="px-3 py-2 text-center text-gray-700">07:30 AM</td>
                                    <td className="px-3 py-2 text-center text-gray-700">05:00 PM</td>
                                    <td className="px-3 py-2 text-right text-gray-700">9.50</td>
                                    <td className="px-3 py-2 text-right text-gray-700">15</td>
                                    <td className="px-3 py-2 text-right text-gray-700">₱240.00</td>
                                    <td className="px-3 py-2 text-right text-gray-700">₱0.00</td>
                                    <td className="px-3 py-2 text-right text-gray-700">1.50</td>
                                    <td className="px-3 py-2 text-right text-gray-700">₱150.00</td>
                                    <td className="px-3 py-2 text-right text-gray-700">₱100.00</td>
                                    <td className="px-3 py-2 text-right text-gray-700">₱50.00</td>
                                    <td className="px-3 py-2 text-right text-gray-700">₱80.00</td>
                                    <td className="px-3 py-2 text-right text-gray-700">₱60.00</td>
                                    <td className="px-3 py-2 text-right text-gray-700">₱500.00</td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                    <td className="px-3 py-2 text-center text-gray-700">May 13, 2026</td>
                                    <td className="px-3 py-2 text-center font-medium text-gray-800">CAR-001</td>
                                    <td className="px-3 py-2 text-right text-gray-700">₱1,800.00</td>
                                    <td className="px-3 py-2 text-center text-gray-700">06:00 PM</td>
                                    <td className="px-3 py-2 text-center text-gray-700">06:00 AM</td>
                                    <td className="px-3 py-2 text-right text-gray-700">12.00</td>
                                    <td className="px-3 py-2 text-right text-gray-700">0</td>
                                    <td className="px-3 py-2 text-right text-gray-700">₱300.00</td>
                                    <td className="px-3 py-2 text-right text-gray-700">₱800.00</td>
                                    <td className="px-3 py-2 text-right text-gray-700">1.50</td>
                                    <td className="px-3 py-2 text-right text-gray-700">₱150.00</td>
                                    <td className="px-3 py-2 text-right text-gray-700">₱100.00</td>
                                    <td className="px-3 py-2 text-right text-gray-700">₱50.00</td>
                                    <td className="px-3 py-2 text-right text-gray-700">₱100.00</td>
                                    <td className="px-3 py-2 text-right text-gray-700">₱70.00</td>
                                    <td className="px-3 py-2 text-right text-gray-700">₱500.00</td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                    <td className="px-3 py-2 text-center text-gray-700">May 12, 2026</td>
                                    <td className="px-3 py-2 text-center font-medium text-gray-800">CAR-007</td>
                                    <td className="px-3 py-2 text-right text-gray-700">₱1,800.00</td>
                                    <td className="px-3 py-2 text-center text-gray-700">08:00 AM</td>
                                    <td className="px-3 py-2 text-center text-gray-700">06:00 PM</td>
                                    <td className="px-3 py-2 text-right text-gray-700">10.00</td>
                                    <td className="px-3 py-2 text-right text-gray-700">10</td>
                                    <td className="px-3 py-2 text-right text-gray-700">₱0.00</td>
                                    <td className="px-3 py-2 text-right text-gray-700">₱0.00</td>
                                    <td className="px-3 py-2 text-right text-gray-700">0.00</td>
                                    <td className="px-3 py-2 text-right text-gray-700">₱0.00</td>
                                    <td className="px-3 py-2 text-right text-gray-700">₱100.00</td>
                                    <td className="px-3 py-2 text-right text-gray-700">₱50.00</td>
                                    <td className="px-3 py-2 text-right text-gray-700">₱60.00</td>
                                    <td className="px-3 py-2 text-right text-gray-700">₱50.00</td>
                                    <td className="px-3 py-2 text-right text-gray-700">₱500.00</td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                    <td className="px-3 py-2 text-center text-gray-700">May 11, 2026</td>
                                    <td className="px-3 py-2 text-center font-medium text-gray-800">CAR-012</td>
                                    <td className="px-3 py-2 text-right text-gray-700">₱1,800.00</td>
                                    <td className="px-3 py-2 text-center text-gray-700">08:30 AM</td>
                                    <td className="px-3 py-2 text-center text-gray-700">05:30 PM</td>
                                    <td className="px-3 py-2 text-right text-gray-700">9.00</td>
                                    <td className="px-3 py-2 text-right text-gray-700">5</td>
                                    <td className="px-3 py-2 text-right text-gray-700">₱150.00</td>
                                    <td className="px-3 py-2 text-right text-gray-700">₱0.00</td>
                                    <td className="px-3 py-2 text-right text-gray-700">0.00</td>
                                    <td className="px-3 py-2 text-right text-gray-700">₱0.00</td>
                                    <td className="px-3 py-2 text-right text-gray-700">₱100.00</td>
                                    <td className="px-3 py-2 text-right text-gray-700">₱50.00</td>
                                    <td className="px-3 py-2 text-right text-gray-700">₱60.00</td>
                                    <td className="px-3 py-2 text-right text-gray-700">₱50.00</td>
                                    <td className="px-3 py-2 text-right text-gray-700">₱500.00</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="mt-3 text-center">
                    <a href="#" className="text-blue-600 text-xs font-medium hover:underline inline-flex items-center">View all trip history <ChevronRight size={14} className="ml-1"/></a>
                </div>
            </div>

        </div>
    </div>
  </div>
);

const AttendanceView = () => (
  <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-200px)] pr-2 pb-10">
    <h2 className="text-xl font-bold text-gray-800">Driver Attendance</h2>
    <p className="text-sm text-gray-500 -mt-4">Manage driver attendance with OCR plate number verification.</p>
    
    {/* Top Filters & Actions Row */}
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
       <div className="flex items-center gap-4 flex-wrap">
         <div className="flex border rounded-lg px-3 py-2 text-sm items-center gap-2 bg-white"><Calendar size={16} className="text-gray-400"/> May 1, 2026 – May 15, 2026</div>
         <select className="px-3 py-2 border rounded-lg text-sm bg-white w-32"><option>All Drivers</option></select>
         <select className="px-3 py-2 border rounded-lg text-sm bg-white w-28"><option>All Types</option></select>
         <select className="px-3 py-2 border rounded-lg text-sm bg-white w-28"><option>All Status</option></select>
       </div>
       <div className="flex gap-3 w-full sm:w-auto">
         <button className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 flex items-center justify-center gap-2 bg-white hover:bg-gray-50"><Download size={16}/> Export</button>
         <button className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-blue-700"><Plus size={16}/> Add Attendance</button>
       </div>
    </div>

    {/* KPI Cards */}
    <div className="grid grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 text-center shadow-sm"><div className="text-2xl font-bold text-gray-800">26</div><div className="text-xs text-gray-500">Total Drivers</div><div className="text-[10px] text-gray-400 mt-1">All active drivers</div></div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 text-center shadow-sm"><div className="text-2xl font-bold text-green-600">21</div><div className="text-xs text-gray-500">Present</div><div className="text-[10px] text-gray-400 mt-1">80.77% of total</div></div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 text-center shadow-sm"><div className="text-2xl font-bold text-orange-500">2</div><div className="text-xs text-gray-500">Late</div><div className="text-[10px] text-gray-400 mt-1">7.69% of total</div></div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 text-center shadow-sm"><div className="text-2xl font-bold text-red-500">3</div><div className="text-xs text-gray-500">Absent</div><div className="text-[10px] text-gray-400 mt-1">11.54% of total</div></div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 text-center shadow-sm"><div className="text-2xl font-bold text-purple-500">0</div><div className="text-xs text-gray-500">On Leave</div><div className="text-[10px] text-gray-400 mt-1">0.00% of total</div></div>
    </div>

    {/* How Attendance Verification Works (Redesigned to match image) */}
    <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 relative">
        {/* Step 1 */}
        <div className="flex flex-col items-center text-center w-full md:w-auto relative">
            <div className="w-14 h-14 bg-white rounded-xl border border-blue-200 flex items-center justify-center text-blue-600 mb-2 shadow-sm"><Camera size={24}/></div>
            <div className="text-xs font-bold text-gray-700">1. Capture Vehicle Image</div>
            <div className="text-[10px] text-gray-500 max-w-[140px]">Staff captures a clear image of the vehicle plate.</div>
        </div>
        {/* Arrow */}
        <div className="hidden md:block text-blue-400"><ChevronRight size={28}/></div>
        
        {/* Step 2 */}
        <div className="flex flex-col items-center text-center w-full md:w-auto relative">
            <div className="w-14 h-14 bg-white rounded-xl border border-blue-200 flex items-center justify-center text-blue-600 mb-2 shadow-sm"><FileText size={24}/></div>
            <div className="text-xs font-bold text-gray-700">2. OCR Extraction (Tesseract)</div>
            <div className="text-[10px] text-gray-500 max-w-[140px]">Tesseract OCR extracts the plate number from the image.</div>
        </div>
        {/* Arrow */}
        <div className="hidden md:block text-blue-400"><ChevronRight size={28}/></div>

        {/* Step 3 */}
        <div className="flex flex-col items-center text-center w-full md:w-auto relative">
            <div className="w-14 h-14 bg-white rounded-xl border border-blue-200 flex items-center justify-center text-blue-600 mb-2 shadow-sm"><Shield size={24}/></div>
            <div className="text-xs font-bold text-gray-700">3. System Verification</div>
            <div className="text-[10px] text-gray-500 max-w-[140px]">System compares OCR result with the entered plate number.</div>
        </div>
        {/* Arrow */}
        <div className="hidden md:block text-blue-400"><ChevronRight size={28}/></div>

        {/* Step 4 */}
        <div className="flex flex-col items-center text-center w-full md:w-auto relative">
            <div className="w-14 h-14 bg-white rounded-xl border border-blue-200 flex items-center justify-center text-blue-600 mb-2 shadow-sm"><FileText size={24}/></div>
            <div className="text-xs font-bold text-gray-700">4. Attendance Recorded</div>
            <div className="text-[10px] text-gray-500 max-w-[140px]">Attendance is saved with verification status.</div>
        </div>
    </div>

    {/* Main Table */}
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white">
          <span className="font-bold text-gray-800 text-sm">Attendance Records</span>
          <div className="relative w-64"><Search className="absolute left-3 top-2.5 text-gray-400" size={14} /><input type="text" placeholder="Search driver name or ID..." className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
      </div>
      
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-center w-8">#</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Driver ID</th>
            <th className="px-4 py-3">Driver Name</th>
            <th className="px-4 py-3">Driver Type</th>
            <th className="px-4 py-3 text-center">Time In</th>
            <th className="px-4 py-3">Car Code</th>
            <th className="px-4 py-3">Entered Plate No.</th>
            <th className="px-4 py-3">OCR Extracted Plate No.</th>
            <th className="px-4 py-3">Verification Status</th>
            <th className="px-4 py-3">Remarks</th>
            <th className="px-4 py-3 text-center">Image</th>
            <th className="px-4 py-3 text-center w-20">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {attendanceRecords.map((r, idx) => (
            <tr key={idx} className="hover:bg-blue-50/30">
              <td className="px-4 py-4 text-gray-600 text-center">{idx + 1}</td>
              <td className="px-4 py-4 text-gray-600 text-xs whitespace-nowrap">{r.date}</td>
              <td className="px-4 py-4 text-xs font-mono text-gray-500">{r.id}</td>
              <td className="px-4 py-4 font-medium text-gray-800 text-xs whitespace-nowrap">{r.name}</td>
              <td className="px-4 py-4 text-gray-600 text-xs">{r.type}</td>
              <td className="px-4 py-4 text-gray-600 text-xs text-center">{r.time}</td>
              <td className="px-4 py-4 text-gray-600 text-xs">{r.car}</td>
              <td className="px-4 py-4 text-gray-600 text-xs">{r.entered}</td>
              <td className="px-4 py-4 text-gray-600 text-xs">{r.extracted}</td>
              <td className="px-4 py-4">
                <span className={`px-2 py-1 rounded-full text-[10px] font-medium whitespace-nowrap 
                  ${r.status === 'Verified' ? 'bg-green-100 text-green-700' : 
                    r.status === 'Mismatch' ? 'bg-orange-100 text-orange-700' : 
                    'bg-red-100 text-red-700'}`}>
                  {r.status}
                </span>
              </td>
              <td className="px-4 py-4 text-gray-500 text-xs">
                  {r.status === 'Mismatch' ? 'Plate mismatch' : 
                   r.status === 'Absent' ? 'No time in' : '-'}
              </td>
              <td className="px-4 py-4 text-center">
                  <button className="text-blue-500 hover:text-blue-700"><Camera size={15}/></button>
              </td>
              <td className="px-4 py-4">
                <div className="flex justify-center gap-2 text-blue-500">
                  <button className="hover:text-blue-700"><Pencil size={14}/></button>
                  <button className="hover:text-red-600"><Trash2 size={14}/></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <div className="px-4 py-3 border-t border-gray-200 flex justify-between items-center text-xs text-gray-500 bg-white">
        <span>Showing 1 to 10 of 26 records</span>
        <div className="flex items-center gap-1">
          <button className="p-1 border rounded hover:bg-gray-50 text-gray-400"><ChevronRight size={14} className="rotate-180"/></button>
          <button className="px-2 py-0.5 border rounded hover:bg-gray-50"><ChevronRight size={14} className="rotate-180"/></button>
          <button className="px-3 py-1 border rounded bg-blue-600 text-white text-[10px] font-medium">1</button>
          <button className="px-3 py-1 border rounded hover:bg-gray-50 text-[10px]">2</button>
          <button className="px-3 py-1 border rounded hover:bg-gray-50 text-[10px]">3</button>
          <span className="px-1 text-gray-400">...</span>
          <button className="p-1 border rounded hover:bg-gray-50"><ChevronRight size={14}/></button>
          <button className="p-1 border rounded hover:bg-gray-50"><ChevronRight size={14}/></button>
          <select className="ml-2 border rounded px-2 py-1 text-[10px] bg-white"><option>10 / page</option></select>
        </div>
      </div>
    </div>
    
    {/* Legend, Notes, and Sample Image (3-Column Layout) */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Legend */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <h4 className="text-xs font-bold text-gray-700 mb-3">Legend <span className="font-normal text-gray-400">(Verification Status)</span></h4>
            <div className="space-y-3 text-[11px]">
                <div className="flex items-start gap-3">
                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium mt-0.5 w-12 text-center">Verified</span>
                    <span className="text-gray-500">OCR plate matches the entered plate.</span>
                </div>
                <div className="flex items-start gap-3">
                    <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium mt-0.5 w-12 text-center">Mismatch</span>
                    <span className="text-gray-500">OCR plate does not match the entered plate.</span>
                </div>
                <div className="flex items-start gap-3">
                    <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium mt-0.5 w-12 text-center">Absent</span>
                    <span className="text-gray-500">Driver did not time in.</span>
                </div>
                <div className="flex items-start gap-3">
                    <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium mt-0.5 w-12 text-center">On Leave</span>
                    <span className="text-gray-500">Driver is on approved leave.</span>
                </div>
            </div>
        </div>

        {/* Center: Notes */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <h4 className="text-xs font-bold text-gray-700 mb-3">Notes:</h4>
            <ul className="text-[11px] text-gray-500 list-disc pl-4 space-y-1">
                <li>Capture a clear image of the vehicle plate for accurate OCR extraction.</li>
                <li>Attendance records can be edited on the same day only.</li>
                <li>Cut-off time for late is 8:00 AM.</li>
                <li>All times are based on system time.</li>
            </ul>
        </div>

        {/* Right: Sample Image */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <h4 className="text-xs font-bold text-gray-700 mb-3">Sample Image</h4>
            <div className="bg-gray-100 rounded-lg h-16 border border-gray-200 flex items-center justify-center overflow-hidden relative">
                {/* Placeholder visual for car plate */}
                <div className="bg-gray-800 text-white font-bold px-4 py-1 rounded shadow-sm text-sm tracking-widest">ABC 1234</div>
            </div>
            <div className="mt-2 text-[10px] text-gray-500 flex gap-2">
                <span>OCR Result:</span>
                <span className="text-green-600 font-medium">ABC 1234</span>
            </div>
        </div>
    </div>
  </div>
);


const NotificationsView = () => (
  <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-200px)] pr-2 pb-10">
    <h2 className="text-xl font-bold text-gray-800">Notifications</h2>
    <p className="text-sm text-gray-500 -mt-4">View and manage system notifications and alerts.</p>
    
    {/* Top Tabs & Search Row */}
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-3 px-6 rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-center gap-6">
        <button className="flex items-center gap-2 border-b-2 border-blue-600 text-blue-600 font-medium text-sm pb-3 -mb-3.5">
          All <span className="bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full ml-1">22</span>
        </button>
        <button className="flex items-center gap-2 text-gray-500 hover:text-gray-800 font-medium text-sm pb-3 -mb-3.5 border-b-2 border-transparent hover:border-gray-300 transition-colors">
          Unread <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full ml-1">3</span>
        </button>
        <button className="text-gray-500 hover:text-gray-800 font-medium text-sm pb-3 -mb-3.5 border-b-2 border-transparent hover:border-gray-300 transition-colors">
          Read
        </button>
      </div>
      <div className="flex gap-3 w-full md:w-auto">
        <div className="relative flex-1 md:w-64">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={16}/>
          <input type="text" placeholder="Search notifications..." className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 flex items-center gap-2">
          <CheckCircle size={16}/> Mark all as read
        </button>
        <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 flex items-center gap-2">
          <Filter size={16}/> Filter <ChevronDown size={14}/>
        </button>
      </div>
    </div>

    {/* Stats Cards */}
    <div className="grid grid-cols-4 gap-4">
      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center gap-3">
        <div className="w-12 h-12 bg-white rounded-lg border border-blue-200 flex items-center justify-center text-blue-500 shadow-sm"><Bell size={24}/></div>
        <div>
          <div className="text-sm font-bold text-gray-800">Total Notifications</div>
          <div className="text-2xl font-bold text-blue-600">22</div>
          <div className="text-xs text-gray-500">All time</div>
        </div>
      </div>
      
      <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex items-center gap-3">
        <div className="w-12 h-12 bg-white rounded-lg border border-green-200 flex items-center justify-center text-green-500 shadow-sm"><Mail size={24}/></div>
        <div>
          <div className="text-sm font-bold text-gray-800">Unread</div>
          <div className="text-2xl font-bold text-green-600">3</div>
          <div className="text-xs text-gray-500">Requires your attention</div>
        </div>
      </div>
      
      <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 flex items-center gap-3">
        <div className="w-12 h-12 bg-white rounded-lg border border-orange-200 flex items-center justify-center text-orange-500 shadow-sm"><AlertCircle size={24}/></div>
        <div>
          <div className="text-sm font-bold text-gray-800">High Priority</div>
          <div className="text-2xl font-bold text-orange-600">4</div>
          <div className="text-xs text-gray-500">Needs immediate action</div>
        </div>
      </div>
      
      <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 flex items-center gap-3">
        <div className="w-12 h-12 bg-white rounded-lg border border-purple-200 flex items-center justify-center text-purple-500 shadow-sm"><Calendar size={24}/></div>
        <div>
          <div className="text-sm font-bold text-gray-800">This Week</div>
          <div className="text-2xl font-bold text-purple-600">9</div>
          <div className="text-xs text-gray-500">May 11 – 17, 2026</div>
        </div>
      </div>
    </div>

    {/* Main Table */}
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
          <tr>
            <th className="px-6 py-3 text-center w-8">#</th>
            <th className="px-6 py-3 w-32">Type</th>
            <th className="px-6 py-3">Title</th>
            <th className="px-6 py-3">Message</th>
            <th className="px-6 py-3 whitespace-nowrap">Date & Time</th>
            <th className="px-6 py-3 text-center">Priority</th>
            <th className="px-6 py-3 text-center">Status</th>
            <th className="px-6 py-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {notifications.map((n, idx) => {
            // Determine icon colors and types to match screenshot
            let IconComponent = Bell;
            let iconColor = "text-gray-500";
            let typeLabel = n.type;

            if(n.type === 'Attendance') {
              if(n.title.includes('Mismatch')) { IconComponent = AlertCircle; iconColor = "text-orange-500"; }
              else if(n.title.includes('Missing')) { IconComponent = XCircle; iconColor = "text-red-500"; }
              else { IconComponent = CheckCircle; iconColor = "text-green-500"; }
            } else if(n.type === 'Payroll') {
              IconComponent = FileText; iconColor = "text-blue-500";
            } else if(n.type === 'Driver Records') {
              IconComponent = Users; iconColor = "text-green-600";
            } else if(n.type === 'Trip (Payroll)') {
              IconComponent = FileText; iconColor = "text-purple-500";
            } else if(n.type === 'System') {
              IconComponent = Settings; iconColor = "text-gray-500";
            }

            return (
              <tr key={idx} className="hover:bg-blue-50/30">
                <td className="px-6 py-4 text-gray-600 text-center">{idx + 1}</td>
                <td className="px-6 py-4 flex items-center gap-2 text-xs font-medium text-gray-700">
                  <IconComponent size={16} className={iconColor} />
                  {typeLabel}
                </td>
                <td className="px-6 py-4 font-medium text-gray-800 text-sm">{n.title}</td>
                <td className="px-6 py-4 text-gray-500 text-xs max-w-xs leading-relaxed">{n.msg}</td>
                <td className="px-6 py-4 text-gray-500 text-xs whitespace-nowrap">{n.date}</td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-medium 
                    ${n.priority === 'High' ? 'bg-red-100 text-red-700' : 
                      n.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 
                      'bg-green-100 text-green-700'}`}>
                    {n.priority}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-medium 
                    ${n.status === 'Unread' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                    {n.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex justify-center gap-2 text-blue-500">
                    <button className="hover:text-blue-700"><Eye size={15}/></button>
                    <button className="hover:text-red-600"><Trash2 size={15}/></button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center text-xs text-gray-500 bg-white">
        <span>Showing 1 to 10 of 22 notifications</span>
        <div className="flex items-center gap-1">
          <button className="p-1 border rounded hover:bg-gray-50 text-gray-400"><ChevronRight size={14} className="rotate-180"/></button>
          <button className="p-1 border rounded hover:bg-gray-50 text-gray-400"><ChevronRight size={14} className="rotate-180"/></button>
          <button className="px-3 py-1 border rounded bg-blue-600 text-white text-[10px] font-medium">1</button>
          <button className="px-3 py-1 border rounded hover:bg-gray-50 text-[10px]">2</button>
          <button className="px-3 py-1 border rounded hover:bg-gray-50 text-[10px]">3</button>
          <span className="px-1 text-gray-400">...</span>
          <button className="p-1 border rounded hover:bg-gray-50"><ChevronRight size={14}/></button>
          <button className="p-1 border rounded hover:bg-gray-50"><ChevronRight size={14}/></button>
          <select className="ml-2 border rounded px-2 py-1 text-[10px] bg-white"><option>10 / page</option></select>
        </div>
      </div>
    </div>
    
    {/* Bottom Section: Legend & Notes (With Envelope) */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Notification Types */}
        <div className="bg-blue-50/30 p-5 rounded-xl border border-blue-100 shadow-sm">
            <h4 className="text-xs font-bold text-gray-700 mb-3">Notification Types</h4>
            <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-[11px]">
                <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-green-100 rounded flex items-center justify-center text-green-600"><FileText size={14}/></div>
                    <div><span className="font-medium text-gray-700 block">Driver Attendance</span><span className="text-gray-500">OCR verification, mismatches</span></div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center text-blue-600"><FileText size={14}/></div>
                    <div><span className="font-medium text-gray-700 block">Payroll</span><span className="text-gray-500">Cut-off reminders, updates</span></div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-green-600 rounded flex items-center justify-center text-white"><Users size={14}/></div>
                    <div><span className="font-medium text-gray-700 block">Driver Records</span><span className="text-gray-500">Driver information updates</span></div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-purple-100 rounded flex items-center justify-center text-purple-600"><FileText size={14}/></div>
                    <div><span className="font-medium text-gray-700 block">Trip (Payroll)</span><span className="text-gray-500">Trip records relevant to payroll</span></div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center text-gray-600"><Settings size={14}/></div>
                    <div><span className="font-medium text-gray-700 block">System</span><span className="text-gray-500">System announcements and maintenance</span></div>
                </div>
            </div>
        </div>

        {/* Right: Notes & Envelope Icon */}
        <div className="bg-blue-50/30 p-5 rounded-xl border border-blue-100 shadow-sm flex justify-between items-start relative">
            <div>
                <h4 className="text-xs font-bold text-gray-700 mb-3">Notes:</h4>
                <ul className="text-[11px] text-gray-600 list-disc pl-4 space-y-1 max-w-sm">
                    <li>Unread notifications will remain in your list until you mark them as read.</li>
                    <li>High priority notifications require immediate attention.</li>
                    <li>All dates and times are based on system time.</li>
                    <li>You can view notification details by clicking the eye icon.</li>
                </ul>
            </div>
            
            {/* The Envelope Icon with red badge */}
            <div className="relative shrink-0 mt-2 mr-4">
                <Mail size={48} className="text-blue-400 opacity-60" />
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[9px] flex items-center justify-center rounded-full border-2 border-white font-bold">3</span>
                {/* Decorative + marks around it */}
                <div className="absolute -left-2 top-1/2 -translate-y-1/2 text-blue-200 text-[10px]">+</div>
                <div className="absolute -right-4 bottom-2 text-blue-200 text-[10px]">+</div>
                <div className="absolute top-3 -right-1 text-blue-200 text-[10px]">+</div>
            </div>
        </div>
    </div>
  </div>
);


const ProfileView = () => (
  <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-200px)] pr-2 pb-10">
    <h2 className="text-xl font-bold text-gray-800">My Profile</h2>
    <p className="text-sm text-gray-500 -mt-4">View and manage your personal information and account settings.</p>
    
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      
      {/* Top Section: Profile Picture & Basic Info */}
      <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row justify-between gap-6">
        <div className="flex flex-col md:flex-row gap-6 w-full md:w-auto">
          {/* Image */}
          <div className="shrink-0">
            <img 
              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80" 
              alt="Maria Santos" 
              className="w-24 h-24 rounded-full object-cover border-4 border-gray-100" 
            />
          </div>
          {/* Name and Contacts */}
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3">
              Maria Santos 
              <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">Active</span>
            </h2>
            <p className="text-gray-500 text-sm mb-2">Payroll Officer</p>
            <div className="space-y-1 text-sm text-gray-600">
              <p className="flex items-center gap-2"><Mail size={16} className="text-gray-400"/> maria.santos@hollydotcarrental.com</p>
              <p className="flex items-center gap-2"><Phone size={16} className="text-gray-400"/> 0917 123 4567</p>
              <p className="flex items-center gap-2"><MapPin size={16} className="text-gray-400"/> Purok 3, Brgy. San Isidro, Clark Freeport Zone, Pampanga 2023</p>
            </div>
          </div>
        </div>

        {/* Right Side: Employee Summary */}
        <div className="flex flex-col md:flex-row gap-8 md:gap-12 pl-0 md:pl-8 border-l-0 md:border-l border-gray-200 w-full md:w-auto">
            <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-4"><span className="text-gray-500">Employee ID</span><span className="font-medium text-gray-800">EMP-005</span></div>
                <div className="flex justify-between gap-4"><span className="text-gray-500">Department</span><span className="font-medium text-gray-800">Payroll Department</span></div>
                <div className="flex justify-between gap-4"><span className="text-gray-500">Role</span><span className="font-medium text-gray-800">Payroll Officer</span></div>
                <div className="flex justify-between gap-4"><span className="text-gray-500">Date Hired</span><span className="font-medium text-gray-800">January 10, 2024</span></div>
                <div className="flex justify-between gap-4"><span className="text-gray-500">Status</span><span className="text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded text-[10px]">Active</span></div>
            </div>
            <div className="flex items-start">
                <button className="flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50"><Pencil size={16}/> Edit Profile</button>
            </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="border-b border-gray-200 px-8 flex gap-8">
          <button className="py-4 border-b-2 border-blue-600 text-blue-600 font-medium text-sm">Overview</button>
          <button className="py-4 text-gray-500 hover:text-gray-800 font-medium text-sm border-b-2 border-transparent hover:border-gray-300 transition-colors">Activity Log</button>
          <button className="py-4 text-gray-500 hover:text-gray-800 font-medium text-sm border-b-2 border-transparent hover:border-gray-300 transition-colors">Notification Preferences</button>
      </div>

      {/* Middle Section: 3-Column Cards */}
      <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Personal Information */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative">
            <div className="flex justify-between items-center mb-5 border-b border-gray-100 pb-3">
              <h4 className="text-sm font-bold text-blue-600 flex items-center gap-2"><User size={16}/> Personal Information</h4>
              <button className="text-xs text-blue-600 hover:underline flex items-center gap-1 border border-blue-200 px-3 py-1 rounded hover:bg-blue-50 transition-colors"><Pencil size={12}/> Edit</button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-gray-50 pb-1.5"><span className="text-gray-500">Full Name</span><span className="font-medium text-gray-800">Maria Santos</span></div>
              <div className="flex justify-between border-b border-gray-50 pb-1.5"><span className="text-gray-500">Date of Birth</span><span className="font-medium text-gray-800">June 15, 1992</span></div>
              <div className="flex justify-between border-b border-gray-50 pb-1.5"><span className="text-gray-500">Gender</span><span className="font-medium text-gray-800">Female</span></div>
              <div className="flex justify-between border-b border-gray-50 pb-1.5"><span className="text-gray-500">Civil Status</span><span className="font-medium text-gray-800">Single</span></div>
              <div className="flex justify-between border-b border-gray-50 pb-1.5"><span className="text-gray-500">Address</span><span className="font-medium text-gray-800 text-xs text-right max-w-[60%]">Purok 3, Brgy. San Isidro, Clark Freeport Zone, Pampanga 2023</span></div>
              <div className="flex justify-between border-b border-gray-50 pb-1.5"><span className="text-gray-500">Nationality</span><span className="font-medium text-gray-800">Filipino</span></div>
              <div className="flex justify-between border-b border-gray-50 pb-1.5"><span className="text-gray-500">Phone Number</span><span className="font-medium text-gray-800">0917 123 4567</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Email Address</span><span className="font-medium text-gray-800 text-xs text-right">maria.santos@hollydotcarrental.com</span></div>
            </div>
        </div>

        {/* Card 2: Account Information */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative">
            <div className="flex justify-between items-center mb-5 border-b border-gray-100 pb-3">
              <h4 className="text-sm font-bold text-blue-600 flex items-center gap-2"><Shield size={16}/> Account Information</h4>
              <button className="text-xs text-blue-600 hover:underline flex items-center gap-1 border border-blue-200 px-3 py-1 rounded hover:bg-blue-50 transition-colors"><Pencil size={12}/> Edit</button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-gray-50 pb-1.5"><span className="text-gray-500">Username</span><span className="font-medium text-gray-800">maria.santos</span></div>
              <div className="flex justify-between border-b border-gray-50 pb-1.5"><span className="text-gray-500">Employee ID</span><span className="font-medium text-gray-800">EMP-005</span></div>
              <div className="flex justify-between border-b border-gray-50 pb-1.5"><span className="text-gray-500">Department</span><span className="font-medium text-gray-800">Payroll Department</span></div>
              <div className="flex justify-between border-b border-gray-50 pb-1.5"><span className="text-gray-500">Role</span><span className="font-medium text-gray-800">Payroll Officer</span></div>
              <div className="flex justify-between border-b border-gray-50 pb-1.5"><span className="text-gray-500">Date Hired</span><span className="font-medium text-gray-800">January 10, 2024</span></div>
              <div className="flex justify-between border-b border-gray-50 pb-1.5"><span className="text-gray-500">Status</span><span className="text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded text-[10px]">Active</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Last Login</span><span className="font-medium text-gray-800">May 15, 2026 10:25 AM</span></div>
            </div>
        </div>

        {/* Card 3: Preferences */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative">
            <div className="flex justify-between items-center mb-5 border-b border-gray-100 pb-3">
              <h4 className="text-sm font-bold text-blue-600 flex items-center gap-2"><Settings size={16}/> Preferences</h4>
              <button className="text-xs text-blue-600 hover:underline flex items-center gap-1 border border-blue-200 px-3 py-1 rounded hover:bg-blue-50 transition-colors"><Pencil size={12}/> Edit</button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-gray-50 pb-1.5"><span className="text-gray-500">Language</span><span className="font-medium text-gray-800">English</span></div>
              <div className="flex justify-between border-b border-gray-50 pb-1.5"><span className="text-gray-500">Date Format</span><span className="font-medium text-gray-800">May 15, 2026</span></div>
              <div className="flex justify-between border-b border-gray-50 pb-1.5"><span className="text-gray-500">Time Format</span><span className="font-medium text-gray-800">12-hour (AM/PM)</span></div>
              <div className="flex justify-between border-b border-gray-50 pb-1.5"><span className="text-gray-500">Timezone</span><span className="font-medium text-gray-800">(GMT+08:00) Asia/Manila</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Items per page</span><span className="font-medium text-gray-800">10</span></div>
            </div>
        </div>
      </div>

      {/* Bottom Section: 2-Column Cards */}
      <div className="p-8 pt-0 grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card 4: Security */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative">
              <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
                <h4 className="text-sm font-bold text-blue-600 flex items-center gap-2"><Lock size={16}/> Security</h4>
                <button className="text-xs text-blue-600 hover:underline flex items-center gap-1 border border-blue-200 px-3 py-1 rounded hover:bg-blue-50 transition-colors"><Lock size={12}/> Change Password</button>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-gray-50 pb-1.5"><span className="text-gray-500">Password</span><span className="font-medium text-gray-800 tracking-widest">********</span></div>
                <div className="flex justify-between border-b border-gray-50 pb-1.5"><span className="text-gray-500">Last Password Change</span><span className="font-medium text-gray-800">April 10, 2026 02:15 PM</span></div>
                <div className="flex justify-between border-b border-gray-50 pb-1.5"><span className="text-gray-500">Two-Factor Authentication</span><span className="text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded text-[10px]">Enabled</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Login Notifications</span><span className="text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded text-[10px]">Enabled</span></div>
              </div>
          </div>

          {/* Card 5: Recent Account Activity */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative">
              <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
                <h4 className="text-sm font-bold text-blue-600 flex items-center gap-2"><Clock size={16}/> Recent Account Activity</h4>
                <button className="text-xs text-blue-600 hover:underline flex items-center gap-1 border border-blue-200 px-3 py-1 rounded hover:bg-blue-50 transition-colors">View All Activity <ChevronRight size={12}/></button>
              </div>
              <table className="w-full text-xs text-left">
                  <thead className="text-gray-500 border-b border-gray-100">
                      <tr>
                          <th className="pb-2 font-medium">Date & Time</th>
                          <th className="pb-2 font-medium">Activity</th>
                          <th className="pb-2 font-medium">Details</th>
                          <th className="pb-2 font-medium text-right">IP Address</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                      <tr><td className="py-2 text-gray-600">May 15, 2026 10:25 AM</td><td className="py-2 font-medium text-gray-700">Logged in</td><td className="py-2 text-gray-500">Successful login</td><td className="py-2 text-gray-500 text-right">192.168.1.10</td></tr>
                      <tr><td className="py-2 text-gray-600">May 15, 2026 10:20 AM</td><td className="py-2 font-medium text-orange-500">Updated Profile</td><td className="py-2 text-gray-500">Profile information updated</td><td className="py-2 text-gray-500 text-right">192.168.1.10</td></tr>
                      <tr><td className="py-2 text-gray-600">May 14, 2026 04:15 PM</td><td className="py-2 font-medium text-orange-500">Changed Password</td><td className="py-2 text-gray-500">Password changed successfully</td><td className="py-2 text-gray-500 text-right">192.168.1.12</td></tr>
                      <tr><td className="py-2 text-gray-600">May 14, 2026 04:10 PM</td><td className="py-2 font-medium text-gray-700">Logged in</td><td className="py-2 text-gray-500">Successful login</td><td className="py-2 text-gray-500 text-right">192.168.1.12</td></tr>
                      <tr><td className="py-2 text-gray-600">May 13, 2026 08:30 AM</td><td className="py-2 font-medium text-gray-700">Logged Out</td><td className="py-2 text-gray-500">User logged out</td><td className="py-2 text-gray-500 text-right">192.168.1.10</td></tr>
                  </tbody>
              </table>
          </div>

      </div>
    </div>
  </div>
);

const SecurityView = () => (
  <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-200px)] pr-2 pb-10">
    <h2 className="text-xl font-bold text-gray-800">Security</h2>
    <p className="text-sm text-gray-500 -mt-4">Manage your account security settings and monitor account activity.</p>
    
    {/* Top Banner: Keep your account secure */}
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col xl:flex-row items-center justify-between gap-6">
      {/* Left Side: Big Shield and Text */}
      <div className="flex items-center gap-5 flex-1 w-full">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 shrink-0">
          <Shield size={32} />
        </div>
        <div>
          <h3 className="font-bold text-gray-800 text-lg">Keep your account secure</h3>
          <p className="text-sm text-gray-500">Your account is protected. Review your security settings and activity regularly.</p>
          <div className="mt-1.5 flex items-center gap-2 text-xs text-green-600 font-medium">
            <CheckCircle size={14} /> All security settings look good
          </div>
        </div>
      </div>

      {/* Right Side: 3 Mini Stats */}
      <div className="flex flex-wrap w-full xl:w-auto justify-between xl:justify-end gap-6 xl:gap-8 border-t xl:border-t-0 pt-4 xl:pt-0 border-gray-100">
        <div className="flex items-center gap-3">
          <Lock className="text-blue-500" size={22} />
          <div>
            <div className="text-xs text-gray-500">Password Strength</div>
            <div className="text-sm font-bold text-green-600">Strong</div>
            <div className="text-[10px] text-gray-400">Last changed: April 10, 2026</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Shield className="text-blue-500" size={22} />
          <div>
            <div className="text-xs text-gray-500">Two-Factor Authentication</div>
            <div className="text-sm font-bold text-green-600">Enabled</div>
            <div className="text-[10px] text-gray-400">Added: January 10, 2024</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Mail className="text-blue-500" size={22} />
          <div>
            <div className="text-xs text-gray-500">Login Notifications</div>
            <div className="text-sm font-bold text-green-600">Enabled</div>
            <div className="text-[10px] text-gray-400">You will be notified of new logins</div>
          </div>
        </div>
      </div>
    </div>

    {/* Middle Section: Change Password & 2FA Side-by-Side */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* Left Card: Change Password */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h4 className="font-bold text-blue-600 text-sm mb-4 flex items-center gap-2">
          <Pencil size={16} /> Change Password
        </h4>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1.5">Current Password</label>
            <div className="relative">
              <input type="password" defaultValue="********" className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50" disabled />
              <Eye size={16} className="absolute right-3 top-2.5 text-gray-400" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1.5">New Password</label>
            <div className="relative">
              <input type="password" defaultValue="********" className="w-full border rounded-lg px-3 py-2 text-sm" />
              <Eye size={16} className="absolute right-3 top-2.5 text-gray-400" />
            </div>
            {/* Green Requirements Checklist */}
            <div className="mt-2 grid grid-cols-2 gap-y-1 gap-x-2 text-[11px] text-green-600 font-medium">
              <div className="flex items-center gap-1"><CheckCircle size={12} /> Minimum 8 characters</div>
              <div className="flex items-center gap-1"><CheckCircle size={12} /> At least 1 uppercase letter</div>
              <div className="flex items-center gap-1"><CheckCircle size={12} /> At least 1 number</div>
              <div className="flex items-center gap-1"><CheckCircle size={12} /> At least 1 special character</div>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1.5">Confirm New Password</label>
            <div className="relative">
              <input type="password" defaultValue="********" className="w-full border rounded-lg px-3 py-2 text-sm" />
              <Eye size={16} className="absolute right-3 top-2.5 text-gray-400" />
            </div>
          </div>
          <button className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            Update Password
          </button>
        </div>
      </div>

      {/* Right Card: Two-Factor Authentication (2FA) */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative">
        <h4 className="font-bold text-blue-600 text-sm mb-1 flex items-center gap-2">
          <Smartphone size={16} /> Two-Factor Authentication (2FA)
        </h4>
        <p className="text-xs text-gray-500 mb-6">Add an extra layer of security to your account.</p>
        
        <div className="flex flex-col md:flex-row justify-between gap-6">
          {/* 2FA Info List */}
          <div className="space-y-3 flex-1">
            <div className="flex justify-between text-sm border-b border-gray-100 pb-1.5">
              <span className="text-gray-500">Status</span>
              <span className="text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded text-[10px]">Enabled</span>
            </div>
            <div className="flex justify-between text-sm border-b border-gray-100 pb-1.5">
              <span className="text-gray-500">Method</span>
              <span className="font-medium text-gray-800">Authenticator App (TOTP)</span>
            </div>
            <div className="flex justify-between text-sm border-b border-gray-100 pb-1.5">
              <span className="text-gray-500">Added On</span>
              <span className="font-medium text-gray-800">January 10, 2024</span>
            </div>
            <div className="flex justify-between text-sm border-b border-gray-100 pb-1.5">
              <span className="text-gray-500">Backup Codes</span>
              <span className="font-medium text-gray-800">8 of 10 remaining</span>
            </div>
          </div>
          
          {/* Mobile Phone Illustration */}
          <div className="w-28 h-40 bg-blue-50/80 rounded-xl border-2 border-blue-200 flex flex-col items-center justify-center text-blue-500 relative shrink-0 mx-auto md:mx-0 shadow-sm">
             <Smartphone size={32} className="mb-2" />
             <div className="text-[10px] text-blue-600 font-bold tracking-widest flex gap-1 mt-2">
                 <span>6</span><span>7</span><span>8</span><span>9</span><span>1</span><span>2</span>
             </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button className="flex-1 py-2 border border-blue-600 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors">
            View Backup Codes
          </button>
          <button className="flex-1 py-2 border border-red-600 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors">
            Disable 2FA
          </button>
        </div>
      </div>
    </div>

    {/* Bottom Section: Activity & Sessions */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* Left: Recent Account Activity */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
          <h4 className="font-bold text-blue-600 text-sm flex items-center gap-2"><Clock size={16} /> Recent Account Activity</h4>
        </div>
        <table className="w-full text-xs text-left">
            <thead className="text-gray-500 border-b border-gray-100">
                <tr>
                    <th className="pb-2 font-medium">Date & Time</th>
                    <th className="pb-2 font-medium">Activity</th>
                    <th className="pb-2 font-medium">Details</th>
                    <th className="pb-2 font-medium">IP Address</th>
                    <th className="pb-2 font-medium">Device</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                <tr><td className="py-2 text-gray-600">May 15, 2026 10:25 AM</td><td className="py-2 font-medium text-gray-800"><span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[9px]">Logged in</span></td><td className="py-2 text-gray-500">Successful login</td><td className="py-2 text-gray-500">192.168.1.10</td><td className="py-2 text-gray-500">Chrome on Windows</td></tr>
                <tr><td className="py-2 text-gray-600">May 15, 2026 10:20 AM</td><td className="py-2 font-medium text-orange-500"><span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-[9px]">Updated Profile</span></td><td className="py-2 text-gray-500">Profile info updated</td><td className="py-2 text-gray-500">192.168.1.10</td><td className="py-2 text-gray-500">Chrome on Windows</td></tr>
                <tr><td className="py-2 text-gray-600">May 14, 2026 04:15 PM</td><td className="py-2 font-medium text-orange-500"><span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-[9px]">Changed Password</span></td><td className="py-2 text-gray-500">Password changed</td><td className="py-2 text-gray-500">192.168.1.12</td><td className="py-2 text-gray-500">Chrome on Windows</td></tr>
                <tr><td className="py-2 text-gray-600">May 14, 2026 04:10 PM</td><td className="py-2 font-medium text-gray-800"><span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[9px]">Logged in</span></td><td className="py-2 text-gray-500">Successful login</td><td className="py-2 text-gray-500">192.168.1.12</td><td className="py-2 text-gray-500">Mobile Safari on iPhone</td></tr>
                <tr><td className="py-2 text-gray-600">May 13, 2026 08:30 AM</td><td className="py-2 font-medium text-gray-800"><span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-[9px]">Logged Out</span></td><td className="py-2 text-gray-500">User logged out</td><td className="py-2 text-gray-500">192.168.1.10</td><td className="py-2 text-gray-500">Chrome on Windows</td></tr>
            </tbody>
        </table>
        <div className="mt-4 text-right">
           <a href="#" className="text-blue-600 text-xs font-medium hover:underline inline-flex items-center">View all activity in My Profile <ChevronRight size={14} className="ml-1"/></a>
        </div>
      </div>

      {/* Right: Active Sessions */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
          <h4 className="font-bold text-blue-600 text-sm flex items-center gap-2"><Smartphone size={16} /> Active Sessions</h4>
        </div>
        <table className="w-full text-xs text-left">
            <thead className="text-gray-500 border-b border-gray-100">
                <tr>
                    <th className="pb-2 font-medium">Device / Browser</th>
                    <th className="pb-2 font-medium">IP Address</th>
                    <th className="pb-2 font-medium">Location</th>
                    <th className="pb-2 font-medium">Last Active</th>
                    <th className="pb-2 font-medium text-center">Status</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                <tr>
                    <td className="py-2 flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[8px]">C</div> <span className="text-gray-700 font-medium">Chrome on Windows</span> <span className="bg-blue-50 text-blue-600 border border-blue-200 text-[8px] px-1 rounded ml-1">Current Session</span></td>
                    <td className="py-2 text-gray-500">192.168.1.10</td>
                    <td className="py-2 text-gray-500">Clark, Pampanga</td>
                    <td className="py-2 text-gray-500">May 15, 2026 10:25 AM</td>
                    <td className="py-2 text-center"><span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[9px] font-medium">Active</span></td>
                </tr>
                <tr>
                    <td className="py-2 flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[8px]">M</div> <span className="text-gray-700 font-medium">Mobile Safari on iPhone</span></td>
                    <td className="py-2 text-gray-500">192.168.1.12</td>
                    <td className="py-2 text-gray-500">Clark, Pampanga</td>
                    <td className="py-2 text-gray-500">May 14, 2026 04:10 PM</td>
                    <td className="py-2 text-center"><span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[9px] font-medium">Active</span></td>
                </tr>
                <tr>
                    <td className="py-2 flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-orange-500 text-white flex items-center justify-center text-[8px]">C</div> <span className="text-gray-700 font-medium">Chrome on Windows</span></td>
                    <td className="py-2 text-gray-500">192.168.1.15</td>
                    <td className="py-2 text-gray-500">Makati City, Philippines</td>
                    <td className="py-2 text-gray-500">May 12, 2026 03:22 PM</td>
                    <td className="py-2 text-center"><span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[9px] font-medium">Logged Out</span></td>
                </tr>
            </tbody>
        </table>
        <div className="mt-4">
           <a href="#" className="text-red-600 text-xs font-medium hover:underline inline-flex items-center"><LogOut size={14} className="mr-1"/> Log out of all other sessions</a>
        </div>
      </div>
    </div>

    {/* Bottom Banner: Security Tips */}
    <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-start gap-3 w-full">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 shrink-0"><Shield size={20}/></div>
            <div className="w-full">
                <h4 className="font-bold text-gray-800 text-sm">Security Tips</h4>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-2 text-[11px] text-gray-700 font-medium">
                    <div className="flex items-center gap-2"><CheckCircle size={14} className="text-blue-500"/> Use a strong password and change it regularly.</div>
                    <div className="flex items-center gap-2"><CheckCircle size={14} className="text-blue-500"/> Do not share your account with anyone.</div>
                    <div className="flex items-center gap-2"><CheckCircle size={14} className="text-blue-500"/> Enable two-factor authentication for extra security.</div>
                    <div className="flex items-center gap-2"><CheckCircle size={14} className="text-blue-500"/> Log out when using shared devices.</div>
                </div>
            </div>
        </div>
    </div>
  </div>
);

const HelpCenterView = () => (
  <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-200px)] pr-2 pb-10">
    <h2 className="text-xl font-bold text-gray-800">Help Center</h2>
    <p className="text-sm text-gray-500 -mt-4">Find answers, guides, and support for using FleetOps.</p>
    
    {/* Top Hero Section */}
    <div className="flex flex-col md:flex-row gap-6">
      {/* Left: Search Hero */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex-1 relative shadow-sm flex flex-col md:flex-row gap-6 items-center">
        {/* Placeholder for Illustration (Woman with laptop) */}
        <div className="w-40 h-40 bg-blue-50 rounded-full flex items-center justify-center shrink-0">
           <div className="text-blue-500 text-6xl">👩‍💻</div>
        </div>
        
        <div className="w-full">
           <h2 className="text-2xl font-bold text-gray-800 mb-2">How can we help you?</h2>
           <p className="text-gray-500 text-sm mb-4">Search for articles, guides, and troubleshooting steps.</p>
           <div className="relative w-full">
             <Search className="absolute left-4 top-3.5 text-gray-400" size={20}/>
             <input type="text" placeholder="Search for help topics, articles, or keywords..." className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm" />
           </div>
        </div>
      </div>

      {/* Right: Can't find what you need */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 w-full md:w-80 shrink-0 shadow-sm flex flex-col justify-center items-center text-center">
          <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-3"><HelpCircle size={28}/></div>
          <h4 className="text-base font-bold text-gray-800">Can't find what you need?</h4>
          <p className="text-xs text-gray-500 mb-4">Our support team is here to help.</p>
          <button className="w-full py-2 border border-blue-600 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 flex justify-center items-center gap-2">
            <MessageSquare size={16}/> Contact Support
          </button>
          <p className="text-xs text-gray-500 mt-3">or email us at <br/> <span className="text-blue-600">support@hollydotcarrental.com</span></p>
      </div>
    </div>

    {/* Browse Help Topics (4-Column Grid) */}
    <div>
      <h4 className="text-sm font-bold text-gray-800 mb-4">Browse Help Topics</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 mb-3"><FileText size={20}/></div>
          <h5 className="font-bold text-gray-800 text-sm mb-1">Payroll Management</h5>
          <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">Learn how to manage payroll periods, cut-off, driver payroll records, verification and completion.</p>
          <button className="text-blue-600 text-xs font-medium hover:underline inline-flex items-center">View Articles <ChevronRight size={14} className="ml-1"/></button>
        </div>
        
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center text-green-600 mb-3"><Users size={20}/></div>
          <h5 className="font-bold text-gray-800 text-sm mb-1">Driver Records</h5>
          <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">Learn how to add, update and manage driver information and details.</p>
          <button className="text-blue-600 text-xs font-medium hover:underline inline-flex items-center">View Articles <ChevronRight size={14} className="ml-1"/></button>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center text-orange-600 mb-3"><UserCheck size={20}/></div>
          <h5 className="font-bold text-gray-800 text-sm mb-1">Driver Attendance (OCR)</h5>
          <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">Understand OCR attendance verification, mismatches, and missing attendance.</p>
          <button className="text-blue-600 text-xs font-medium hover:underline inline-flex items-center">View Articles <ChevronRight size={14} className="ml-1"/></button>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600 mb-3"><Bell size={20}/></div>
          <h5 className="font-bold text-gray-800 text-sm mb-1">Notifications</h5>
          <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">Learn about system notifications, alerts and reminders.</p>
          <button className="text-blue-600 text-xs font-medium hover:underline inline-flex items-center">View Articles <ChevronRight size={14} className="ml-1"/></button>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center text-teal-600 mb-3"><Shield size={20}/></div>
          <h5 className="font-bold text-gray-800 text-sm mb-1">Security</h5>
          <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">Learn about account security, access control and data protection.</p>
          <button className="text-blue-600 text-xs font-medium hover:underline inline-flex items-center">View Articles <ChevronRight size={14} className="ml-1"/></button>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center text-yellow-600 mb-3"><User size={20}/></div>
          <h5 className="font-bold text-gray-800 text-sm mb-1">My Profile</h5>
          <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">Manage your profile information and account settings.</p>
          <button className="text-blue-600 text-xs font-medium hover:underline inline-flex items-center">View Articles <ChevronRight size={14} className="ml-1"/></button>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center text-red-600 mb-3"><HelpCircle size={20}/></div>
          <h5 className="font-bold text-gray-800 text-sm mb-1">Troubleshooting</h5>
          <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">Find solutions to common issues and system errors.</p>
          <button className="text-blue-600 text-xs font-medium hover:underline inline-flex items-center">View Articles <ChevronRight size={14} className="ml-1"/></button>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 mb-3"><FileQuestion size={20}/></div>
          <h5 className="font-bold text-gray-800 text-sm mb-1">System Guides</h5>
          <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">Step-by-step guides and best practices for using FleetOps.</p>
          <button className="text-blue-600 text-xs font-medium hover:underline inline-flex items-center">View Articles <ChevronRight size={14} className="ml-1"/></button>
        </div>
      </div>
    </div>

    {/* Bottom Section: Popular Articles & System Status */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Left 2/3: Popular Articles */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm lg:col-span-2">
        <h4 className="text-sm font-bold text-gray-800 mb-4">Popular Articles</h4>
        <div className="space-y-0">
            <div className="flex justify-between items-center p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer rounded transition-colors">
                <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-blue-50 rounded flex items-center justify-center text-blue-500"><FileText size={12}/></div>
                    <span className="text-sm font-medium text-gray-700">How OCR Attendance Verification Works</span>
                </div>
                <div className="text-gray-400"><ChevronRight size={16}/></div>
            </div>
            <div className="flex justify-between items-center p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer rounded transition-colors">
                <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-blue-50 rounded flex items-center justify-center text-blue-500"><FileText size={12}/></div>
                    <span className="text-sm font-medium text-gray-700">How to Process Driver Payroll</span>
                </div>
                <div className="text-gray-400"><ChevronRight size={16}/></div>
            </div>
            <div className="flex justify-between items-center p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer rounded transition-colors">
                <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-blue-50 rounded flex items-center justify-center text-blue-500"><FileText size={12}/></div>
                    <span className="text-sm font-medium text-gray-700">Understanding Payroll Cut-off</span>
                </div>
                <div className="text-gray-400"><ChevronRight size={16}/></div>
            </div>
            <div className="flex justify-between items-center p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer rounded transition-colors">
                <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-blue-50 rounded flex items-center justify-center text-blue-500"><FileText size={12}/></div>
                    <span className="text-sm font-medium text-gray-700">What to Do When Attendance is Missing</span>
                </div>
                <div className="text-gray-400"><ChevronRight size={16}/></div>
            </div>
            <div className="flex justify-between items-center p-3 hover:bg-gray-50 cursor-pointer rounded transition-colors">
                <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-blue-50 rounded flex items-center justify-center text-blue-500"><FileText size={12}/></div>
                    <span className="text-sm font-medium text-gray-700">Understanding Payroll Verification</span>
                </div>
                <div className="text-gray-400"><ChevronRight size={16}/></div>
            </div>
        </div>
        <div className="mt-4">
           <a href="#" className="text-blue-600 text-xs font-medium hover:underline inline-flex items-center">View all articles <ChevronRight size={14} className="ml-1"/></a>
        </div>
      </div>

      {/* Right 1/3: System Status */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex justify-between items-center mb-1">
            <h4 className="text-sm font-bold text-gray-800">System Status</h4>
            <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 font-medium"><CheckCircle size={10}/> All Systems Operational</span>
        </div>
        <p className="text-[11px] text-gray-500 mb-4">All systems are running smoothly.</p>
        
        <div className="border-t border-gray-100 pt-3">
            <div className="flex justify-between items-center py-1.5 text-xs font-medium border-b border-gray-50"><span className="text-gray-500">Service</span><span className="text-gray-500">Status</span><span className="text-gray-500">Uptime</span></div>
            <div className="flex justify-between items-center py-1.5 text-xs"><span className="text-gray-700 flex items-center gap-2"><CheckCircle size={12} className="text-green-600"/> Web Application</span><span className="text-green-600 font-medium">Operational</span><span className="text-gray-500">100%</span></div>
            <div className="flex justify-between items-center py-1.5 text-xs"><span className="text-gray-700 flex items-center gap-2"><CheckCircle size={12} className="text-green-600"/> Database</span><span className="text-green-600 font-medium">Operational</span><span className="text-gray-500">100%</span></div>
            <div className="flex justify-between items-center py-1.5 text-xs"><span className="text-gray-700 flex items-center gap-2"><CheckCircle size={12} className="text-green-600"/> OCR Service</span><span className="text-green-600 font-medium">Operational</span><span className="text-gray-500">100%</span></div>
            <div className="flex justify-between items-center py-1.5 text-xs"><span className="text-gray-700 flex items-center gap-2"><CheckCircle size={12} className="text-green-600"/> File Storage</span><span className="text-green-600 font-medium">Operational</span><span className="text-gray-500">100%</span></div>
            <div className="flex justify-between items-center py-1.5 text-xs"><span className="text-gray-700 flex items-center gap-2"><CheckCircle size={12} className="text-green-600"/> Email Service</span><span className="text-green-600 font-medium">Operational</span><span className="text-gray-500">100%</span></div>
        </div>
        
        <div className="mt-4 flex justify-between items-center border-t border-gray-100 pt-3">
           <a href="#" className="text-blue-600 text-xs font-medium hover:underline inline-flex items-center">View system status page <ChevronRight size={14} className="ml-1"/></a>
           <span className="text-[10px] text-gray-400">Last updated: May 15, 2026 10:30 AM</span>
        </div>
      </div>
    </div>

    {/* Bottom Callout Banner */}
    <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
      <div className="flex items-start sm:items-center gap-4">
        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white shrink-0"><Info size={20}/></div>
        <div>
          <h4 className="font-bold text-gray-800 text-sm">Still need help?</h4>
          <p className="text-xs text-gray-600 mt-0.5">If you can't find the answer you're looking for, our support team is ready to assist you.</p>
        </div>
      </div>
      <button className="w-full sm:w-auto px-6 py-2.5 bg-white border border-blue-600 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 flex items-center justify-center gap-2 shrink-0 transition-colors">
        <MessageSquare size={16}/> Contact Support
      </button>
    </div>
  </div>
);

// --- CURRENT CAR RATES VIEW ---
const emptyCarRateForm = { carCode: '', vehicleType: '', dailyRate: '', plateNumber: '', carOwner: '', assignedDriver: '' };

const CarRatesView = () => {
  const [cars, setCars] = useState(carRateRecords);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState(emptyCarRateForm);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const openAddModal = () => { setForm(emptyCarRateForm); setShowAddModal(true); };
  const closeAddModal = () => { setShowAddModal(false); setForm(emptyCarRateForm); };

  const setField = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!form.carCode.trim() || !form.vehicleType.trim() || !form.dailyRate.trim()) return;

    const nextId = cars.length ? Math.max(...cars.map((c) => c.id)) + 1 : 1;
    const today = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const parts = form.vehicleType.trim().split(' ');

    setCars((prev) => [...prev, {
      id: nextId,
      code: form.carCode.trim(),
      since: `since ${today}`,
      category: parts[0] || form.vehicleType.trim(),
      vehicle: parts.length > 1 ? parts.slice(1).join(' ') : form.vehicleType.trim(),
      rate: form.dailyRate.startsWith('₱') ? form.dailyRate.trim() : `₱${form.dailyRate.trim()}`,
      driver: form.assignedDriver.trim(),
      plate: form.plateNumber.trim(),
      owner: form.carOwner.trim() || 'Company Owned',
      status: 'Available',
    }]);
    closeAddModal();
  };

  const confirmDelete = () => {
    setCars((prev) => prev.filter((c) => c.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  return (
  <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-200px)] pr-2 pb-10">
    <h2 className="text-xl font-bold text-gray-800">Current Car Rates</h2>
    <p className="text-sm text-gray-500 -mt-4">Manage the daily rate and assigned driver for each car code used in payroll.</p>

    {/* Top Controls Row */}
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div className="flex items-center gap-4 flex-1 flex-wrap">
         <div className="relative flex-1 max-w-sm bg-white"><Search className="absolute left-3 top-2.5 text-gray-400" size={16} /><input type="text" placeholder="Search car code, driver, plate..." className="pl-9 pr-4 py-2 border rounded-lg text-sm w-full focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
         <select className="px-3 py-2 border rounded-lg text-sm text-gray-600 bg-white"><option>All</option></select>
      </div>
      <div className="flex gap-3">
         <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 flex items-center gap-2 bg-white hover:bg-gray-50"><Download size={16}/> Export</button>
      </div>
    </div>

    {/* Car Rate List */}
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className="px-6 py-5 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-gray-800">Car Rate List</h3>
            <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">15</span>
          </div>
          <p className="text-sm text-gray-500 mt-1">15 active cars &bull; 0 assigned &bull; 15 unassigned</p>
        </div>
        <button onClick={openAddModal} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-700 shrink-0"><Plus size={16} /> Add</button>
      </div>

      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
          <tr>
            <th className="px-6 py-3">CAR CODE</th>
            <th className="px-6 py-3">VEHICLE TYPE</th>
            <th className="px-6 py-3">DAILY RATE</th>
            <th className="px-6 py-3">ASSIGNED DRIVER</th>
            <th className="px-6 py-3">PLATE NUMBER</th>
            <th className="px-6 py-3">CAR OWNER</th>
            <th className="px-6 py-3">STATUS</th>
            <th className="px-6 py-3 text-center">ACTIONS</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {cars.map((c) => (
            <tr key={c.id} className="hover:bg-blue-50/30 transition-colors">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-800 whitespace-nowrap">{c.code}</span>
                  {c.since && <span className="text-xs text-gray-400">{c.since}</span>}
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="font-medium text-gray-800">{c.category}</div>
                <div className="text-xs text-gray-500">{c.vehicle}</div>
              </td>
              <td className="px-6 py-4 font-bold text-gray-800 whitespace-nowrap">{c.rate}</td>
              <td className="px-6 py-4 text-gray-400">{c.driver || 'Unassigned'}</td>
              <td className="px-6 py-4 text-gray-600">{c.plate}</td>
              <td className="px-6 py-4 text-gray-500">{c.owner}</td>
              <td className="px-6 py-4">
                <span className={`px-3 py-1 rounded-full text-[11px] font-medium ${c.status === 'Available' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{c.status}</span>
              </td>
              <td className="px-6 py-4">
                <div className="flex justify-center gap-3 text-blue-500">
                  <button title="Edit car rate" className="hover:text-blue-700"><Pencil size={16}/></button>
                  <button title="Assign driver" className="hover:text-blue-700"><UserPlus size={16}/></button>
                  <button title="Rate history" className="hover:text-blue-700"><History size={16}/></button>
                  <button onClick={() => setDeleteTarget(c)} title="Delete car rate" className="hover:text-red-600"><Trash2 size={16}/></button>
                </div>
              </td>
            </tr>
          ))}
          {cars.length === 0 && (
            <tr><td colSpan={8} className="px-6 py-8 text-center text-sm text-gray-400">No car rate records yet. Click Add to create one.</td></tr>
          )}
        </tbody>
      </table>
    </div>

    {/* Add Car Rate Modal */}
    {showAddModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
            <h4 className="text-base font-bold text-gray-800">Add Car Rate</h4>
            <button onClick={closeAddModal} title="Close" className="text-gray-400 hover:text-gray-600"><XCircle size={20}/></button>
          </div>
          <form onSubmit={handleAddSubmit} className="px-6 py-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Car Code <span className="text-red-500">*</span></label>
                <input type="text" value={form.carCode} onChange={setField('carCode')} placeholder="HD-MPV-016" className="w-full border rounded px-3 py-2 bg-gray-50 text-gray-600 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Vehicle Type <span className="text-red-500">*</span></label>
                <input type="text" value={form.vehicleType} onChange={setField('vehicleType')} placeholder="MPV Toyota Innova" className="w-full border rounded px-3 py-2 bg-gray-50 text-gray-600 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Daily Rate <span className="text-red-500">*</span></label>
                <input type="text" value={form.dailyRate} onChange={setField('dailyRate')} placeholder="₱1,500.00" className="w-full border rounded px-3 py-2 bg-gray-50 text-gray-600 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Plate Number</label>
                <input type="text" value={form.plateNumber} onChange={setField('plateNumber')} placeholder="ABC 1234" className="w-full border rounded px-3 py-2 bg-gray-50 text-gray-600 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Car Owner</label>
                <input type="text" value={form.carOwner} onChange={setField('carOwner')} placeholder="Company Owned" className="w-full border rounded px-3 py-2 bg-gray-50 text-gray-600 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Assigned Driver</label>
                <select value={form.assignedDriver} onChange={setField('assignedDriver')} className="w-full border rounded px-3 py-2 bg-gray-50 text-gray-600 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="">Unassigned</option>
                  {driverRecords.filter((d) => d.status === 'Active').map((d) => (<option key={d.id} value={d.name}>{d.name}</option>))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-5 mt-5 border-t border-gray-200">
              <button type="button" onClick={closeAddModal} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-700"><Plus size={16}/> Add</button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* Delete Car Rate Confirmation Modal */}
    {deleteTarget && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0"><AlertTriangle size={20}/></div>
            <div>
              <h4 className="text-base font-bold text-gray-800">Delete Car Rate?</h4>
              <p className="text-sm text-gray-500 mt-1">Are you sure you want to delete this car rate? This action cannot be undone.</p>
              <p className="text-xs text-gray-400 mt-2">{deleteTarget.code} &bull; {deleteTarget.category} {deleteTarget.vehicle}</p>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-red-700"><Trash2 size={16}/> Delete</button>
          </div>
        </div>
      </div>
    )}
  </div>
  );
};

// --- MAIN APP ---
function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch(activeTab) {
      case 'dashboard': return <DashboardView />;
      case 'payroll': return <PayrollView />;
      case 'carrates': return <CarRatesView />;
      case 'drivers': return <DriversView />;
      case 'attendance': return <AttendanceView />;
      case 'notifications': return <NotificationsView />;
      case 'profile': return <ProfileView />;
      case 'security': return <SecurityView />;
      case 'help': return <HelpCenterView />;
      default: return <DashboardView />;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f3f4f6]">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="ml-64 flex-1 px-8 pb-10 w-full h-screen overflow-hidden">
        <Header />
        {renderContent()}
      </div>
    </div>
  );
}

export default App;