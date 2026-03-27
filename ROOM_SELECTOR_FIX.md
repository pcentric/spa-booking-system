# Room Selector API Response Fix

## Problem
The Room Selector was not properly handling the API response structure which returns nested capacity categories with rooms inside items.

### API Response Structure
```javascript
Array[24]  // 24 capacity categories
├── [0] {
│   capacity_sort_key: "single"
│   capacity_type: "single"
│   floor: 1
│   item_category: "Single Bed"
│   items: Array[1]     // Rooms nested here
│   ├── [0] {
│   │   item: "single-bed"
│   │   item_id: 31
│   │   item_name: "801 Bed A"
│   │   room_code: "801"
│   │   room_id: 6           // ← Actual room ID
│   │   room_name: "801 Single Room"  // ← Actual room name
│   │   bookings: Array[1]   // Existing bookings
│   │   └── [0] {
│   │       booking_id: 205653
│   │       start_time: "09:15"
│   │       end_time: "10:45"
│   │   }
│   └── ...
│   └── [23] More rooms...
│
└── [1-23] More capacity categories...
```

## Solution

### 1. Updated roomService.js
Flattened the nested API response structure into a simple array of rooms:

```javascript
// Extract rooms from nested capacity_group > items structure
const rooms = [];
capacityGroups.forEach(group => {
  if (group.items && Array.isArray(group.items)) {
    group.items.forEach(item => {
      if (item.room_id && item.room_name) {
        rooms.push({
          id: item.room_id,              // Standardized: room_id → id
          name: item.room_name,          // Standardized: room_name → name
          code: item.room_code,          // Room code
          item_name: item.item_name,     // Bed/item name
          item_category: item.item_category,  // Type (Single Bed, Sofa, etc.)
          capacity_type: item.capacity_type,  // Capacity (single, double, hall)
          bookings: item.bookings || [], // Existing bookings for availability
        });
      }
    });
  }
});
```

**Result:** Flat array of 24 rooms with standardized field names

### 2. Updated RoomSelector.js
Enhanced room display to show more useful information:

```javascript
{rooms.map(room => (
  <option key={room.id} value={room.id}>
    {room.name} (code) - item_category
    // Example: "801 Single Room (801) - Single Bed"
  </option>
))}
```

## Field Mapping

| API Field | Transformed Field | Usage |
|-----------|------------------|-------|
| room_id | id | Dropdown value |
| room_name | name | Display text |
| room_code | code | Room code display |
| item_name | item_name | Bed/item identifier |
| item_category | item_category | Room type display |
| capacity_type | capacity_type | Capacity info |
| bookings | bookings | Availability check |

## Room Types Available

Based on the API response:

**Single Rooms:**
- 801-807 Single Rooms
- 809-812 Single Rooms
- 817 Single Room

**Couples Rooms:**
- 803, 813-816, 818-819 Couples Rooms

**Common Areas:**
- 820 (5 Seats) - Sofa
- 821 (2 Seats) - Sofa
- Main Hall 505 - Monkey Chair
- Main Hall 6 Seat - Sofa

## Benefits

✅ **Proper Data Extraction** - Correctly extracts rooms from nested structure
✅ **Standardized Format** - Consistent field names across the app
✅ **More Information** - Displays room code and category in dropdown
✅ **Booking Awareness** - Stores existing bookings for potential availability checking
✅ **Better UX** - Users see meaningful room descriptions

## Testing Checklist

- [ ] Room dropdown loads without errors
- [ ] All 24 rooms are available in dropdown
- [ ] Room names display correctly (e.g., "801 Single Room (801) - Single Bed")
- [ ] Selected room value is saved correctly
- [ ] Room availability is accurate
- [ ] No duplicate rooms in dropdown
- [ ] Different room types (Single, Couples, Hall) are all present

## Example Output

```
Select a room
801 Single Room (801) - Single Bed
804 Single Room (804) - Single Bed
805 Single Room (805) - Single Bed
...
803 Couples Room (803) - Single Bed
...
820 (5 Seats) (820) - Sofa
Main Hall 505 (Main) - Monkey Chair
Main Hall 6 Seat (Main) - Sofa
```

