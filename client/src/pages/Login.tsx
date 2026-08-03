import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'http://localhost:4000/api';

const Login: React.FC = () => {
    const [userId, setUserId] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!userId.trim()) return;

        try {
            await axios.post(`${API_URL}/login`, { login_id: userId });
            localStorage.setItem('login_id', userId);
            navigate('/products');
        } catch (err) {
            console.error('Login failed:', err);
        }
    };

    return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
            <h1>로그인</h1>
            <form onSubmit={handleLogin}>
                <input
                    type="text"
                    placeholder="사용자 ID를 입력하세요"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    style={{ padding: '0.5rem', marginRight: '0.5rem' }}
                />
                <button type="submit" style={{ padding: '0.5rem 1rem' }}>로그인</button>
            </form>
        </div>
    );
};

export default Login;
