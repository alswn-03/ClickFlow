import React from 'react';
import { Link } from 'react-router-dom';

export const products = [
    { id: 'prod_001', name: '멋진 티셔츠', price: '25,000원', image: '👕' },
    { id: 'prod_002', name: '편한 바지', price: '35,000원', image: '👖' },
    { id: 'prod_003', name: '예쁜 모자', price: '15,000원', image: '🧢' },
    { id: 'prod_004', name: '따뜻한 후드티', price: '45,000원', image: '🧥' },
];

const ProductList: React.FC = () => {
    return (
        <div style={{ padding: '2rem' }}>
            <h1>상품 전체 목록</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
                {products.map((product) => (
                    <div key={product.id} style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem' }}>{product.image}</div>
                        <h3>{product.name}</h3>
                        <p>{product.price}</p>
                        <Link to={`/product/${product.id}`} style={{ textDecoration: 'none', color: '#007bff', fontWeight: 'bold' }}>
                            상세보기
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ProductList;
