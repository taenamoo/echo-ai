import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Logout() {
  const nav = useNavigate();
  useEffect(() => {
    localStorage.removeItem('accessToken');
    nav('/', { replace: true });
  }, [nav]);
  return null;
}

