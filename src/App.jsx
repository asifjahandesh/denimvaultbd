import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import ProductDetails from './pages/ProductDetails'
import AdminDashboard from './pages/admin/AdminDashboard'

function App() {
  // Read saved language preference or default to Bangla 'bn'
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('lang') || 'bn'
  })

  const handleSetLang = (newLang) => {
    setLang(newLang)
    localStorage.setItem('lang', newLang)
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={<LandingPage lang={lang} setLang={handleSetLang} />} 
        />
        <Route 
          path="/product/:id" 
          element={<ProductDetails lang={lang} setLang={handleSetLang} />} 
        />
        <Route 
          path="/admin" 
          element={<AdminDashboard />} 
        />
      </Routes>
    </Router>
  )
}

export default App
