# 🚀 DeliverApp Mission Flow API Testing Guide

## 📋 **Complete Mission Flow APIs**

### **Prerequisites**
- ✅ User registered as Shipper
- ✅ User registered as Carrier  
- ✅ Both users approved by admin
- ✅ JWT tokens for both users

---

## 🎯 **Mission Flow Testing Sequence**

### **Step 1: Create Mission (Shipper)**
```bash
POST /api/missions
Authorization: Bearer {SHIPPER_JWT}
Content-Type: application/json

{
  "shipment_type": "freight",
  "loading_location": "Toulouse",
  "loading_address": "12 rue des Lilas",
  "loading_city": "Toulouse", 
  "loading_postal_code": "31000",
  "shipper_phone": "+33 6 59 97 12 13",
  "loading_date": "2025-09-18",
  "loading_time": "13h20",
  "loading_instructions": "Ne pas jeter le colis",
  "loading_staff_name": "UPS",
  "goods_type": "Fresh Products",
  "temperature_range": "fresh",
  "length_m": 1.2,
  "width_m": 0.8,
  "height_m": 0.6,
  "weight_kg": 7,
  "volume_m3": 0.576,
  "fragile": false,
  "delivery_location": "Lyon",
  "delivery_address": "12 rue des Lilas",
  "delivery_city": "Lyon",
  "delivery_postal_code": "69000",
  "recipient_phone": "+33 6 59 97 12 13",
  "delivery_date": "2025-09-18",
  "delivery_time": "11h20",
  "delivery_instructions": "Please ring before entering",
  "recipient_name": "UPS",
  "message": "Please ring before entering",
  "distance_km": 245.5
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Mission created successfully",
  "data": {
    "id": "cmg7mcbp0000fiha47jb9w2um",
    "status": "CREATED",
    "final_price": 189.04,
    "base_price": 171.85,
    "commission_amount": 17.18
  }
}
```

---

### **Step 2: Set Mission Price (Shipper) - Screen 2**
```bash
POST /api/missions/{MISSION_ID}/set-price
Authorization: Bearer {SHIPPER_JWT}
Content-Type: application/json

{
  "price": 200
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Mission price updated successfully",
  "data": {
    "mission_id": "cmg7mcbp0000fiha47jb9w2um",
    "new_price": 200,
    "base_price": 180,
    "commission": 20
  }
}
```

**Test Price Decrease (Should Fail):**
```bash
POST /api/missions/{MISSION_ID}/set-price
Authorization: Bearer {SHIPPER_JWT}
Content-Type: application/json

{
  "price": 150
}
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Price can only be increased. Current price: €200, New price: €150",
  "data": {
    "current_price": 200,
    "minimum_price": 200.01
  }
}
```

---

### **Step 3: Confirm Mission (Shipper) - Screen 3**
```bash
POST /api/missions/{MISSION_ID}/confirm
Authorization: Bearer {SHIPPER_JWT}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Mission confirmed successfully. We are looking for the best carrier for you.",
  "data": {
    "mission_id": "cmg7mcbp0000fiha47jb9w2um",
    "order_number": "CMD47JB9W2UM",
    "status": "SEARCHING_CARRIER",
    "price": 200
  }
}
```

---

### **Step 4: Carrier Accepts Mission**
```bash
POST /api/missions/{MISSION_ID}/accept
Authorization: Bearer {CARRIER_JWT}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Mission accepted successfully. Waiting for shipper selection.",
  "data": {
    "acceptance_id": "cmg7mcbp0001fiha47jb9w2um",
    "mission": {
      "id": "cmg7mcbp0000fiha47jb9w2um",
      "pickup_address": "12 rue des Lilas, Toulouse 31000",
      "delivery_address": "12 rue des Lilas, Lyon 69000",
      "final_price": 200
    },
    "carrier": {
      "id": "cmg7m945w0003iha43atwmx96",
      "name": "John Carrier",
      "avatar": "avatar_url",
      "average_rating": 4.5
    },
    "status": "PENDING"
  }
}
```

---

### **Step 5: Get Shipper Dashboard (Shipper) - Screen 4**
```bash
GET /api/missions/dashboard
Authorization: Bearer {SHIPPER_JWT}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "new_offers": [
      {
        "mission_id": "cmg7mcbp0000fiha47jb9w2um",
        "offer_id": "HWDSF47JB9W",
        "route": "Toulouse - Lyon",
        "date": "2025-10-01T06:41:57.300Z",
        "price": 200,
        "carrier_count": 1,
        "carriers": [
          {
            "id": "cmg7m945w0003iha43atwmx96",
            "name": "John Carrier",
            "avatar": "avatar_url",
            "rating": 4.5,
            "total_reviews": 25,
            "completed_missions": 150,
            "accepted_at": "2025-10-01T06:45:30.200Z"
          }
        ]
      }
    ],
    "orders_in_progress": [],
    "recent_orders": [
      {
        "id": "cmg7mcbp0000fiha47jb9w2um",
        "order_number": "CMD47JB9W2UM",
        "status": "SEARCHING_CARRIER",
        "date": "2025-10-01T06:41:57.300Z",
        "price": 200,
        "carrier": null
      }
    ]
  }
}
```

---

### **Step 6: Get Accepted Carriers (Shipper) - Screen 5**
```bash
GET /api/missions/{MISSION_ID}/accepted-carriers
Authorization: Bearer {SHIPPER_JWT}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "mission_id": "cmg7mcbp0000fiha47jb9w2um",
    "route": "Toulouse - Lyon",
    "price": 200,
    "accepted_carriers": [
      {
        "id": "cmg7m945w0003iha43atwmx96",
        "name": "John Carrier",
        "avatar": "avatar_url",
        "rating": 4.5,
        "total_reviews": 25,
        "completed_missions": 150,
        "phone_number": "+33 6 12 34 56 78",
        "accepted_at": "2025-10-01T06:45:30.200Z",
        "acceptance_id": "cmg7mcbp0001fiha47jb9w2um"
      }
    ]
  }
}
```

---

### **Step 7: Select Carrier (Shipper) - Screen 5**
```bash
POST /api/missions/{MISSION_ID}/select-carrier
Authorization: Bearer {SHIPPER_JWT}
Content-Type: application/json

{
  "carrier_id": "cmg7m945w0003iha43atwmx96"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Carrier selected successfully. Mission is now in progress.",
  "data": {
    "mission_id": "cmg7mcbp0000fiha47jb9w2um",
    "selected_carrier": {
      "id": "cmg7m945w0003iha43atwmx96",
      "name": "John Carrier",
      "avatar": "avatar_url",
      "average_rating": 4.5
    },
    "status": "ACCEPTED"
  }
}
```

---

## 🧪 **Additional Test Cases**

### **Test Multiple Carriers Accepting**
1. Create mission (Shipper)
2. Set price and confirm (Shipper)
3. Accept mission with Carrier 1
4. Accept mission with Carrier 2
5. Check dashboard shows 2 carriers
6. Select Carrier 1
7. Verify Carrier 2's acceptance is marked as rejected

### **Test Error Cases**
- Try to set price below current price
- Try to confirm mission that's not in CREATED status
- Try to accept mission that's not SEARCHING_CARRIER
- Try to select carrier who didn't accept
- Try to access endpoints with wrong user type

### **Test Authorization**
- Try shipper endpoints with carrier JWT
- Try carrier endpoints with shipper JWT
- Try endpoints without JWT

---

## 📊 **Expected Database Changes**

### **MissionAcceptance Table**
```sql
-- After carrier accepts mission
INSERT INTO mission_acceptances (id, mission_id, carrier_id, status, created_at)
VALUES ('cmg7mcbp0001fiha47jb9w2um', 'cmg7mcbp0000fiha47jb9w2um', 'cmg7m945w0003iha43atwmx96', 'PENDING', NOW());

-- After shipper selects carrier
UPDATE mission_acceptances 
SET status = 'ACCEPTED' 
WHERE mission_id = 'cmg7mcbp0000fiha47jb9w2um' AND carrier_id = 'cmg7m945w0003iha43atwmx96';

UPDATE mission_acceptances 
SET status = 'REJECTED' 
WHERE mission_id = 'cmg7mcbp0000fiha47jb9w2um' AND carrier_id != 'cmg7m945w0003iha43atwmx96';
```

### **Mission Table**
```sql
-- After shipper selects carrier
UPDATE missions 
SET carrier_id = 'cmg7m945w0003iha43atwmx96', status = 'ACCEPTED' 
WHERE id = 'cmg7mcbp0000fiha47jb9w2um';
```

---

## 🎯 **Success Criteria**

✅ **Mission Creation**: Auto-pricing works correctly  
✅ **Price Adjustment**: Can only increase price  
✅ **Mission Confirmation**: Status changes to SEARCHING_CARRIER  
✅ **Carrier Acceptance**: Creates MissionAcceptance record  
✅ **Shipper Dashboard**: Shows carrier acceptances with ratings  
✅ **Carrier Selection**: Updates mission and marks other acceptances as rejected  
✅ **Authorization**: Proper role-based access control  
✅ **Error Handling**: Appropriate error messages for invalid operations  

---

## 🚀 **Ready to Test!**

Use these APIs to test the complete mission flow from creation to carrier selection. Each step should work seamlessly and match your UI screens!
