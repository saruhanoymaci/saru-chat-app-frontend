import React from "react";

const Loading = () => {
  return (
    <div className="fixed inset-0 bg-gray-100 bg-opacity-75 flex items-center justify-center z-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
      </div>
    </div>
  );
};

export default Loading;
