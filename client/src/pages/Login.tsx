import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
    const [userId, setUserId] = useState('');
    const navigate = useNavigate();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (userId.trim()) {
            localStorage.setItem('user_id', userId);
            navigate('/products');
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
