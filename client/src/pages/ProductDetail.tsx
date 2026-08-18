import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { trackEvent } from '../services/logger';

const API_URL = 'http://localhost:4000/api';

interface Item {
    id: string;
    item_name: string;
    price: number;
    information: string | null;
    image_url: string | null;
}

const ProductDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [item, setItem] = useState<Item | null>(null);

    useEffect(() => {
        if (!id) return;
        axios.get(`${API_URL}/items`).then(res => {
            const found = res.data.find((i: Item) => i.id === id) ?? null;
            setItem(found);
        });
        trackEvent('view', id);
    }, [id]);

    const handleAddToCart = () => {
        trackEvent('addtocart', id);
        alert('장바구니에 담겼습니다!');
    };

    const handlePurchase = async () => {
        const userId = localStorage.getItem('user_id');
        if (!userId || !id) return;
        try {
            await axios.post(`${API_URL}/transaction`, { user_id: userId, item_id: id });
            trackEvent('transaction', id);
            alert('결제가 완료되었습니다!');
        } catch (err) {
            console.error('Purchase failed:', err);
            alert('결제에 실패했습니다.');
        }
    };

    if (!item) {
        return <div style={{ padding: '2rem' }}>상품을 찾을 수 없습니다. <Link to="/products">목록으로</Link></div>;
    }

    return (
        <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
            <Link to="/products" style={{ marginBottom: '1rem', display: 'block' }}>← 목록으로 돌아가기</Link>
            <div style={{ border: '1px solid #ddd', padding: '2rem', borderRadius: '12px', textAlign: 'center' }}>
                <img
                    src={item.image_url || ''}
                    alt={item.item_name}
                    style={{ width: '100%', maxHeight: '300px', objectFit: 'contain', marginBottom: '1rem' }}
                />
                <h1 style={{ fontSize: '1.4rem', lineHeight: '1.5', wordBreak: 'keep-all', overflowWrap: 'break-word' }}>{item.item_name}</h1>
                {item.information && <p style={{ color: '#666', marginBottom: '1rem' }}>{item.information}</p>}
                <p style={{ fontSize: '1.5rem', color: '#333' }}>{item.price.toLocaleString()}원</p>
                <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <button
                        onClick={handleAddToCart}
                        style={{ padding: '1rem 2rem', backgroundColor: '#f0f0f0', border: '1px solid #ccc', cursor: 'pointer', fontSize: '1rem' }}
                    >
                        장바구니 넣기
                    </button>
                    <button
                        onClick={handlePurchase}
                        style={{ padding: '1rem 2rem', backgroundColor: '#007bff', color: 'white', border: 'none', cursor: 'pointer', fontSize: '1rem' }}
                    >
                        결제하기
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductDetail;
