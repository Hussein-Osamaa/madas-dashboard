import axios from 'axios';

export const api = axios.create({
  baseURL: '',
  headers: { 'Content-Type': 'application/json' },
});

export const API_BASE = '/api';
