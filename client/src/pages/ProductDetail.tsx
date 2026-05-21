import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { products } from './ProductList';
import { trackEvent } from '../services/logger';

const ProductDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const product = products.find((p) => p.id === id);

    useEffect(() => {
        if (id) {
            trackEvent('view_detail', id);
        }
    }, [id]);

    const handleAddToCart = () => {
        trackEvent('add_to_cart', id);
        alert('장바구니에 담겼습니다!');
    };

    const handlePurchase = () => {
        trackEvent('purchase', id);
        alert('결제가 완료되었습니다!');
    };

    if (!product) {
        return <div style={{ padding: '2rem' }}>상품을 찾을 수 없습니다. <Link to="/products">목록으로</Link></div>;
    }

    return (
        <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
            <Link to="/products" style={{ marginBottom: '1rem', display: 'block' }}>← 목록으로 돌아가기</Link>
            <div style={{ border: '1px solid #ddd', padding: '2rem', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '6rem' }}>{product.image}</div>
                <h1>{product.name}</h1>
                <p style={{ fontSize: '1.5rem', color: '#333' }}>{product.price}</p>
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
