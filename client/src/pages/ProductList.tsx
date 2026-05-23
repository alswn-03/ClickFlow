import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'http://localhost:4000/api';

interface Item {
    id: string;
    item_name: string;
    price: number;
    information: string | null;
    image_url: string | null;
}

const ProductList: React.FC = () => {
    const [items, setItems] = useState<Item[]>([]);

    useEffect(() => {
        axios.get(`${API_URL}/items`).then(res => setItems(res.data));
    }, []);

    return (
        <div style={{ padding: '2rem' }}>
            <h1>상품 전체 목록</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
                {items.map((item) => (
                    <div key={item.id} style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                        <img
                            src={item.image_url || ''}
                            alt={item.item_name}
                            style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '4px' }}
                        />
                        <h3>{item.item_name}</h3>
                        <p>{item.price.toLocaleString()}원</p>
                        <Link to={`/product/${item.id}`} style={{ textDecoration: 'none', color: '#007bff', fontWeight: 'bold' }}>
                            상세보기
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ProductList;
