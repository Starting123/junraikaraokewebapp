const db = require('../db');

// Get all orders
exports.getAllOrders = async () => {
    const [orders] = await db.execute('SELECT * FROM orders ORDER BY created_at DESC');
    return orders;
};

// Get order by ID
exports.getOrderById = async (id) => {
    const [orders] = await db.execute('SELECT * FROM orders WHERE id = ?', [id]);
    return orders[0] || null;
};

// Create new order
exports.createOrder = async (orderData) => {
    const { user_id, booking_id, amount, status, payment_method, transaction_id } = orderData;
    const [result] = await db.execute(
        'INSERT INTO orders (user_id, booking_id, amount, status, payment_method, transaction_id, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
        [user_id, booking_id, amount, status || 'pending', payment_method || null, transaction_id || null]
    );
    return { id: result.insertId, ...orderData };
};

// Update order
exports.updateOrder = async (id, updateData) => {
    const { status, payment_method, transaction_id } = updateData;
    await db.execute(
        'UPDATE orders SET status = COALESCE(?, status), payment_method = COALESCE(?, payment_method), transaction_id = COALESCE(?, transaction_id), updated_at = NOW() WHERE id = ?',
        [status, payment_method, transaction_id, id]
    );
    return true;
};

// Delete order
exports.deleteOrder = async (id) => {
    await db.execute('DELETE FROM orders WHERE id = ?', [id]);
    return true;
};

// Get orders for a user
exports.getOrdersByUser = async (user_id) => {
    const [orders] = await db.execute('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [user_id]);
    return orders;
};

// Get orders for a booking
exports.getOrdersByBooking = async (booking_id) => {
    const [orders] = await db.execute('SELECT * FROM orders WHERE booking_id = ? ORDER BY created_at DESC', [booking_id]);
    return orders;
};
