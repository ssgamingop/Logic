import { useState, useEffect } from 'react';

function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('groqApiKey') || '');
  const [image, setImage] = useState(null);
  const [questionText, setQuestionText] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Save API key to local storage
  useEffect(() => {
    if (apiKey) localStorage.setItem('groqApiKey', apiKey);
  }, [apiKey]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target.result);
        setError('');
        setAnswer('');
        setQuestionText('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePaste = (e) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        const reader = new FileReader();
        reader.onload = (event) => {
          setImage(event.target.result);
          setError('');
          setAnswer('');
          setQuestionText('');
        };
        reader.readAsDataURL(file);
      }
    }
  };

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const getAnswer = async () => {
    if (!apiKey) {
      setError('Please enter your Groq API Key first.');
      return;
    }
    if (!image && !questionText) {
      setError('Please upload an image or type a question.');
      return;
    }

    setLoading(true);
    setError('');
    setAnswer('');

    try {
      let promptText = "For this multiple choice question, think step-by-step. At the VERY END of your response, respond with ONLY the correct option letter and text on a new line. Format: 'Correct Answer: [letter] - [option text]'.";
      let payloadMessages = [];

      if (image && !questionText) {
        // Use Vision model to extract and answer
        payloadMessages = [
          {
            role: "user",
            content: [
              { type: "text", text: `Extract the question from this image perfectly, then answer it. ${promptText}` },
              { type: "image_url", image_url: { url: image } }
            ]
          }
        ];
      } else {
        // Just text
        payloadMessages = [
          { role: "system", content: "You are a helpful study tutor." },
          { role: "user", content: `${promptText}\n\nQuestion:\n${questionText}` }
        ];
      }

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: payloadMessages,
          model: image && !questionText ? "llama-3.2-11b-vision-preview" : "llama-3.3-70b-versatile",
          temperature: 0.1,
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || "API Error");
      }

      const data = await response.json();
      let text = data.choices?.[0]?.message?.content;

      // Highlight the correct answer line
      const answerLineMatch = text.match(/(Correct Answer:.*)/i);
      if (answerLineMatch) {
         // Optionally you could strip everything else or just show it all
      }
      setAnswer(text);

    } catch (err) {
      setError(err.message || 'Failed to connect to AI');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="header">
        <h1>Crackit Web ⚡️</h1>
        <p>100% Undetectable Mobile OCR</p>
      </div>

      <div className="api-section">
        <label>⚙️ Groq API Key</label>
        <div className="api-input-group">
          <input 
            type="password" 
            placeholder="gsk_..." 
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>
      </div>

      {!image ? (
        <div className="upload-area">
          <input type="file" accept="image/*" onChange={handleImageUpload} capture="environment" />
          <span className="upload-icon">📸</span>
          <div className="upload-text">Take Photo or Upload</div>
          <div className="upload-sub">You can also paste (Cmd+V) an image here</div>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
           <img src={image} alt="Preview" className="image-preview" />
           <button 
             onClick={() => setImage(null)} 
             style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer' }}
           >
             ✕
           </button>
        </div>
      )}

      {error && <div style={{ color: 'var(--danger)', fontSize: '13px', marginBottom: '16px', textAlign: 'center' }}>⚠️ {error}</div>}

      <button className="btn-primary" onClick={getAnswer} disabled={loading || (!image && !questionText)}>
        {loading ? (
          <><span className="spinner"></span> Solving...</>
        ) : (
          <>✨ Solve with AI</>
        )}
      </button>

      {answer && (
        <div className="response-card">
          <h3>AI Tutor Response</h3>
          <div className="response-text">{answer}</div>
        </div>
      )}
    </div>
  );
}

export default App;
