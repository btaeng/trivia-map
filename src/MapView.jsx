import { MapContainer, TileLayer, GeoJSON, Marker, Popup } from 'react-leaflet';
import { useState } from 'react';

const geoJsonFiles = import.meta.glob('./assets/*.json', { eager: true });

const geoJsonList = Object.values(geoJsonFiles).map(data => {
  const feature = data.features?.[0];
  const countryName = feature?.properties?.NAME || "Unknown location";
  return { name: countryName, data };
});

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
  // Render the map and UI
  return (
    <MapContainer center={[0, 0]} zoom={2} style={{ height: '100vh', width: '100vw' }}>
      <TileLayer
        attribution='© OpenStreetMap contributors'
        url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      />
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 1000 }}>
        {['history', 'geography', 'entertainment', 'cuisine', 'culture'].map(cat => (
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
      {geoJsonList.map(({ name, data }) => (
        <GeoJSON
          key={name}
          data={data}
          style={{ color: '#3388ff', weight: 2, fillOpacity: 0.1 }}
          onEachFeature={(feature, layer) => {
            layer.on({
              mouseover: e => e.target.setStyle({ color: '#ff7800', weight: 3 }),
              mouseout: e => e.target.setStyle({ color: '#3388ff', weight: 2 }),
              click: async e => {
                const trivia = await getTrivia(name, category);
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