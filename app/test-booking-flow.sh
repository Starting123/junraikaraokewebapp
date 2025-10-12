#!/bin/bash

# Test script to verify booking flow fixes
# Run from app directory

echo "🧪 TESTING BOOKING FLOW FIXES"
echo "=============================="

echo "1. 📋 Testing Homepage Controller..."
curl -s "http://localhost:3000/" > /dev/null
if [ $? -eq 0 ]; then
    echo "   ✅ Homepage loads successfully"
else 
    echo "   ❌ Homepage failed to load"
fi

echo ""
echo "2. 🔑 Testing Authentication..."
curl -s -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test1@gmail.com","password":"Test123!@#"}' > /tmp/auth_test.json

TOKEN=$(cat /tmp/auth_test.json | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
if [ ! -z "$TOKEN" ]; then
    echo "   ✅ Authentication successful"
else
    echo "   ❌ Authentication failed"
    exit 1
fi

echo ""
echo "3. 🏠 Testing Rooms API..."
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/rooms" > /tmp/rooms_test.json
ROOM_COUNT=$(cat /tmp/rooms_test.json | grep -o '"room_id"' | wc -l)
echo "   ✅ Found $ROOM_COUNT rooms"

echo ""
echo "4. 📝 Testing Booking Form Submission..."
ROOM_ID=$(cat /tmp/rooms_test.json | grep -o '"room_id":[0-9]*' | head -1 | cut -d':' -f2)
START_TIME=$(date -d '+2 hours' '+%Y-%m-%dT%H:00:00')
END_TIME=$(date -d '+4 hours' '+%Y-%m-%dT%H:00:00')

curl -s -X POST "http://localhost:3000/api/bookings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"fullname\": \"Test User\",
    \"phone\": \"0123456789\",
    \"address\": \"123 Test Street\",
    \"room_id\": $ROOM_ID,
    \"start_time\": \"$START_TIME\",
    \"end_time\": \"$END_TIME\"
  }" > /tmp/booking_test.json

if grep -q '"success":true' /tmp/booking_test.json; then
    echo "   ✅ Booking created successfully"
else
    echo "   ❌ Booking failed:"
    cat /tmp/booking_test.json
fi

echo ""
echo "5. 📊 Testing Booking List..."
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/bookings" > /tmp/bookings_list.json
BOOKING_COUNT=$(cat /tmp/bookings_list.json | grep -o '"booking_id"' | wc -l)
echo "   ✅ Found $BOOKING_COUNT bookings"

echo ""
echo "🎉 TESTS COMPLETED"
echo "=================="

# Cleanup
rm -f /tmp/auth_test.json /tmp/rooms_test.json /tmp/booking_test.json /tmp/bookings_list.json