import Link from 'next/link';
import { useSidebar } from '../context/SidebarContext';
import { X, Menu, Home, BarChart2, Calendar, Users, ClipboardList, BookOpen, Video, FileText } from 'lucide-react';

export default function Sidebar() {
  const { isOpen, toggle, close, isMobile } = useSidebar();

  return (
    <aside
      className={`sidebar ${isMobile ? `fixed inset-y-0 left-0 w-64 z-40 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 bg-white border-r border-gray-200 glass` : 'hidden md:block'}`}
      aria-label="Sidebar navigation"
    >
      {/* Mobile close button */}
      {isMobile && (
        <button
          onClick={close}
          className="absolute top-4 right-4 p-2 text-gray-600 hover:text-gray-800"
          aria-label="Close sidebar"
        >
          <X size={20} />
        </button>
      )}
      <nav className="h-full overflow-y-auto pt-8">
        <ul className="space-y-2 px-4">
          <li>
            <Link href="/mahasiswa/beranda" className="flex items-center gap-3 p-3 rounded-md hover:bg-blue-50 hover:text-blue-600 text-gray-700 transition-colors font-medium">
              <Home size={18} />
              Beranda
            </Link>
          </li>
          <li>
            <Link href="/mahasiswa/nilai" className="flex items-center gap-3 p-3 rounded-md hover:bg-blue-50 hover:text-blue-600 text-gray-700 transition-colors font-medium">
              <BarChart2 size={18} />
              Nilai
            </Link>
          </li>
          <li>
            <Link href="/mahasiswa/jadwal-online" className="flex items-center gap-3 p-3 rounded-md hover:bg-blue-50 hover:text-blue-600 text-gray-700 transition-colors font-medium">
              <Calendar size={18} />
              Jadwal Online
            </Link>
          </li>
          <li>
            <Link href="/mahasiswa/kehadiran" className="flex items-center gap-3 p-3 rounded-md hover:bg-blue-50 hover:text-blue-600 text-gray-700 transition-colors font-medium">
              <Users size={18} />
              Kehadiran
            </Link>
          </li>
          <li>
            <Link href="/mahasiswa/tugas-online" className="flex items-center gap-3 p-3 rounded-md hover:bg-blue-50 hover:text-blue-600 text-gray-700 transition-colors font-medium">
              <ClipboardList size={18} />
              Tugas Online
            </Link>
          </li>
          <li>
            <Link href="/mahasiswa/matakuliah" className="flex items-center gap-3 p-3 rounded-md hover:bg-blue-50 hover:text-blue-600 text-gray-700 transition-colors font-medium">
              <Video size={18} />
              Kelas Virtual
            </Link>
          </li>
          <li>
            <Link href="/mahasiswa/ujian-online" className="flex items-center gap-3 p-3 rounded-md hover:bg-blue-50 hover:text-blue-600 text-gray-700 transition-colors font-medium">
              <FileText size={18} />
              Ujian Online
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
