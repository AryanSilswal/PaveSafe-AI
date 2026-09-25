import Link from "next/link";
import { ShieldAlert, Activity } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-8 transition-colors">
      <div className="max-w-2xl text-center space-y-8">
        <div className="flex justify-center mb-4">
          <img src="/logo.svg" alt="PaveSafe Logo" className="w-16 h-16 drop-shadow-md" />
        </div>
        <h1 className="text-5xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
          PaveSafe AI
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300">
          Intelligent Pothole Detection & Route Safety Optimization Platform
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <Link 
            href="/commuter" 
            className="flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg"
          >
            <Activity size={20} />
            Commuter Module
          </Link>
          <Link 
            href="/admin" 
            className="flex items-center justify-center gap-2 px-8 py-4 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-lg border border-gray-200 dark:border-gray-700"
          >
            <ShieldAlert size={20} />
            Admin Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
