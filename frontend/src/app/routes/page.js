'use client';   
  
import { useState } from 'react';   
import { searchRoutes } from '@/services/api';   
  
export default function RoutesPage() {   
 const [origin, setOrigin] = useState('');   
 const [destination, setDestination] = useState('');   
 const [routes, setRoutes] = useState([]);   
 const [loading, setLoading] = useState(false);   
 const [error, setError] = useState('');   
  
 const handleSearch = async (e) => {   
   e.preventDefault();   
   setLoading(true);   
   setError('');   
   setRoutes([]);   
  
   try {   
     const results = await searchRoutes({ origin, destination });   
     setRoutes(results);   
   } catch (err) {   
     setError(err.response?.data?.error?.message || 'Failed to search routes');   
   } finally {   
     setLoading(false);   
   }   
 };   
  
 const getRouteTypeLabel = (stops) => {   
   if (stops === 0) return 'Direct';   
   if (stops === 1) return '1 Stop';   
   if (stops === 2) return '2 Stops';   
   return `${stops} Stops`;   
 };   
  
 return (   
   <div>   
     <h1>Find Routes</h1>   
     <p className="description">Discover optimal multi-leg routes using BFS algorithm</p>   
  
     <form onSubmit={handleSearch} className="search-form">   
       <div className="form-group">   
         <label>Origin Airport</label>   
         <input    
           type="text"    
           placeholder="e.g., JFK"    
           value={origin}   
           onChange={(e) => setOrigin(e.target.value.toUpperCase())}   
           maxLength={3}   
           required   
         />   
       </div>   
  
       <div className="form-group">   
         <label>Destination Airport</label>   
         <input    
           type="text"    
           placeholder="e.g., LAX"    
           value={destination}   
           onChange={(e) => setDestination(e.target.value.toUpperCase())}   
           maxLength={3}   
           required   
         />   
       </div>   
  
       <button type="submit" className="btn btn-primary" disabled={loading}>   
         {loading ? 'Searching...' : 'Find Routes'}   
       </button>   
     </form>   
  
     {error && (   
       <div className="alert alert-error">   
         <strong>Error:</strong> {error}   
       </div>   
     )}   
  
     {routes.length > 0 && (   
       <div className="results">   
         <h2>Found {routes.length} Routes</h2>   
            
         {routes.map((route, idx) => (   
           <div key={idx} className="route-card">   
             <div className="route-header">   
               <h3>Route {idx + 1}</h3>   
               <span className="badge badge-info">   
                 {getRouteTypeLabel(route.stops)}   
               </span>   
               <span className="route-duration">   
                 Total: {route.totalDuration} min   
               </span>   
             </div>   
  
             <div className="route-legs">   
               {route.legs.map((leg, legIdx) => (   
                 <div key={legIdx} className="leg-card">   
                   <div className="leg-number">Leg {legIdx + 1}</div>   
                   <div className="leg-details">   
                     <div className="leg-flight">   
                       <strong>{leg.flightNumber}</strong> - {leg.airline}   
                     </div>   
                     <div className="leg-route">   
                       <span className="airport">{leg.departureAirport}</span>   
                       <span className="arrow">→</span>   
                       <span className="airport">{leg.arrivalAirport}</span>   
                     </div>   
                     <div className="leg-times">   
                       <small>   
                         {new Date(leg.departureTime).toLocaleTimeString()} -    
                         {new Date(leg.arrivalTime).toLocaleTimeString()}   
                       </small>   
                     </div>   
                   </div>   
                      
                   {route.layovers && route.layovers[legIdx] && (   
                     <div className="layover-info">   
                       ⏱️ Layover: {route.layovers[legIdx].duration} min at {route.layovers[legIdx].airport}   
                     </div>   
                   )}   
                 </div>   
               ))}   
             </div>   
           </div>   
         ))}   
       </div>   
     )}   
  
     {!loading && routes.length === 0 && !error && (   
       <div className="empty-state">   
         <p>Enter origin and destination to find routes</p>   
       </div>   
     )}   
   </div>   
 );   
}   
 