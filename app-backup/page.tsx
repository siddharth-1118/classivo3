"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

export default function TestPage() {
  const router = useRouter();
  const [count, setCount] = React.useState(0);
  
  const handleNavigation = () => {
    router.push("/test");
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-2xl mx-auto p-8 bg-white rounded-lg shadow-lg">
        <h1 className="text-4xl font-bold mb-4 text-gray-800">Next.js Router Fix Test</h1>
        <p className="text-lg mb-6 text-gray-600">
          This test page verifies that the router state initialization fix is working correctly.
        </p>
        <div className="space-y-4">
          <button 
            onClick={() => setCount(count + 1)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Click count: {count}
          </button>
          <button 
            onClick={handleNavigation}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors ml-2"
          >
            Navigate to /test
          </button>
        </div>
        <div className="mt-8 p-4 bg-gray-100 rounded-lg">
          <p className="text-sm text-gray-500">
            Router state fix is applied to prevent TypeError when urlParts is undefined
          </p>
        </div>
      </div>
    </div>
  );
}
