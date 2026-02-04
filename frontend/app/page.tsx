export default function Home() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Just some dummy cards to show layout */}
      <div className="aspect-video rounded-xl bg-gray-100/50 p-6">
        <h2 className="font-bold text-lg">Total Sales</h2>
        <p className="text-3xl font-bold mt-2">$12,345</p>
      </div>
      <div className="aspect-video rounded-xl bg-gray-100/50 p-6">
         <h2 className="font-bold text-lg">Inventory Status</h2>
         <p className="text-3xl font-bold mt-2 text-green-600">Healthy</p>
      </div>
      <div className="aspect-video rounded-xl bg-gray-100/50 p-6">
         <h2 className="font-bold text-lg">Pending Uploads</h2>
         <p className="text-3xl font-bold mt-2">0 Files</p>
      </div>
    </div>
  );
}