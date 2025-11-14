import { MapContainer, TileLayer, GeoJSON, Marker, Popup } from 'react-leaflet';
import { useState, useRef, useEffect } from 'react';

import allCountries from './assets/countries.json';

const geoJsonList = allCountries.features.map(feature => {
  const props = feature.properties || {};
  return {
    name: props.NAME || "Unknown",
    subregion: props.SUBREGION || "Unknown",
    data: {
      type: "FeatureCollection",
      features: [feature]
    }
  };
});

const regions = [...new Set(geoJsonList.map(c => c.subregion))];

// Function to fetch trivia question from the server
async function getTrivia(locationName, category) {
  try {
    console.log('Fetching trivia for location:', locationName);
    const res = await fetch('/api/trivia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location: locationName, category }),
    });
    const data = await res.json();
    return {
      question: data.question || 'No trivia available.',
      choices: data.choices || [],
      answerIndex: data.answerIndex
    };
  } catch (err) {
    console.error('Error fetching trivia:', err);
    return { question: 'Error fetching trivia.', answer: null };
  }
}

// Main component
export default function MapView() {
  const [marker, setMarker] = useState(null);
  const [category, setCategory] = useState('history');
  const [trivia, setTrivia] = useState({
    question: '',
    choices: [],
    answerIndex: null
  });
  const [feedback, setFeedback] = useState('');
  const [selectedRegion, setSelectedRegion] = useState(null);
  const categoryRef = useRef(category);
  useEffect(() => {
    categoryRef.current = category;
  }, [category]);
  const visibleCountries = selectedRegion
  ? geoJsonList.filter(c => c.subregion === selectedRegion)
  : [];
  // Render the map and UI
  return (
    <MapContainer center={[0, 0]} zoom={2} style={{ height: '100vh', width: '100vw' }}>
      <TileLayer
        attribution='© OpenStreetMap contributors'
        url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      />
      {!selectedRegion && (
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0,0,0,0.8)",
          zIndex: 2000,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "white"
        }}>
          <h2>Select a Region</h2>
          <select
            style={{
              padding: '10px 20px',
              fontSize: '1.2rem',
              backgroundColor: '#333',
              color: 'white',
              border: '1px solid #555',
              borderRadius: '6px'
            }}
            defaultValue=""
            onChange={e => setSelectedRegion(e.target.value)}
          >
            <option value="" disabled>Choose a region</option>
            {regions.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      )}
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 1000 }}>
        {['history', 'geography', 'government/politics', 'economy', 'culture', 'cuisine'].map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            style={{
              marginRight: '5px',
              padding: '6px 10px',
              backgroundColor: category === cat ? '#444' : '#222',
              border: '1px solid #888',
              cursor: 'pointer'
            }}
          >
            {cat}
          </button>
        ))}
      </div>
      <div style={{
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 1000,
        backgroundColor: '#222',
        padding: '8px',
        borderRadius: '6px'
      }}>
        <label style={{ color: 'white', marginRight: '8px' }}>
          Region:
        </label>
        <select
          style={{
            padding: '4px 8px',
            backgroundColor: '#333',
            color: 'white',
            border: '1px solid #555',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
          value={selectedRegion || ""}
          onChange={e => {
            const region = e.target.value;
            setSelectedRegion(region);
            setMarker(null);
            setTrivia({});
          }}
        >
          <option value="" disabled>Select region</option>
          {regions.map(r => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      {visibleCountries.map(({ name, data }) => (
        <GeoJSON
          key={name}
          data={data}
          style={{ color: '#3388ff', weight: 2, fillOpacity: 0.1 }}
          onEachFeature={(feature, layer) => {
            layer.on({
              mouseover: e => e.target.setStyle({ color: '#ff7800', weight: 3 }),
              mouseout: e => e.target.setStyle({ color: '#3388ff', weight: 2 }),
              click: async e => {
                const trivia = await getTrivia(name, categoryRef.current);
                setMarker(e.latlng);
                setTrivia(trivia);
                setFeedback('');
              }
            });
          }}
        />
      ))}

      {marker && (
        <Marker
          key={`${marker.lat}-${marker.lng}`}
          position={marker}
          eventHandlers={{ add: (e) => e.target.openPopup() }}
        >
          <Popup>
            <div style={{ width: '200px' }}>
              <p>{trivia.question}</p>

              {trivia.choices.length > 0 && (
                <div>
                  {trivia.choices.map((choice, i) => (
                    <button
                      key={i}
                      style={{ width: '100%', marginBottom: '0.4rem' }}
                      onClick={() => {
                        if (i === trivia.answerIndex) {
                          setFeedback('Correct!');
                        } else {
                          setFeedback(`Incorrect. The correct answer was: ${trivia.choices[trivia.answerIndex]}`);
                        }
                      }}
                    >
                      {choice}
                    </button>
                  ))}
                  {feedback && <p>{feedback}</p>}
                </div>
              )}
            </div>
          </Popup>
        </Marker>
      )}

    </MapContainer>
  );
}