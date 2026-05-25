import Link from 'next/link';
import { useSidebar } from '../context/SidebarContext';
import { X, Menu } from 'lucide-react';

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
            <Link href="/mahasiswa/dashboard" className="flex items-center gap-2 p-2 rounded hover:bg-gray-100">
              <span>🏠</span>
              Dashboard
            </Link>
          </li>
          <li>
            <Link href="/mahasiswa/nilai" className="flex items-center gap-2 p-2 rounded hover:bg-gray-100">
              <span>📊</span>
              Nilai
            </Link>
          </li>
          <li>
            <Link href="/mahasiswa/jadwal-online" className="flex items-center gap-2 p-2 rounded hover:bg-gray-100">
              <span>📅</span>
              Jadwal Online
            </Link>
          </li>
          <li>
            <Link href="/mahasiswa/kehadiran" className="flex items-center gap-2 p-2 rounded hover:bg-gray-100">
              <span>👥</span>
              Kehadiran
            </Link>
          </li>
          <li>
            <Link href="/mahasiswa/tugas-online" className="flex items-center gap-2 p-2 rounded hover:bg-gray-100">
              <span>📝</span>
              Tugas Online
            </Link>
          </li>
          <li>
            <Link href="/mahasiswa/uts" className="flex items-center gap-2 p-2 rounded hover:bg-gray-100">
              <span>🗒️</span>
              UTS
            </Link>
          </li>
          <li>
            <Link href="/mahasiswa/uas" className="flex items-center gap-2 p-2 rounded hover:bg-gray-100">
              <span>🗒️</span>
              UAS
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
