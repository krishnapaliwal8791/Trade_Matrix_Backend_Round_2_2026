const fs = require('fs');
let content = fs.readFileSync('FRONTEND_INTEGRATION.md', 'utf8');

// 1. Add endpoint to list
content = content.replace(
  '- GET /users/active-news-bundle',
  '- GET /users/active-news-bundle\n- GET /users/news-bundles/:id'
);

// 2. Replace frontend flow and append section 8
const searchString = **Frontend Flow:**
1. Call \GET /users/active-news-bundle\
2. If data is null:
   - Show a waiting / no active bundle state
   - Do not call \GET /users/news-bundles/:id\
3. If data is not null:
   - Use \data.id\ to call \GET /users/news-bundles/:id\`;

const replaceString = **Frontend Flow:**

GET /users/active-news-bundle
    ↓
If data is null → show waiting state
    ↓
If data exists
    ↓
GET /users/news-bundles/:id
    ↓
Render news articles

---

### 8. Get News Bundle Details

- **HTTP Method:** \GET\
- **Path:** \/users/news-bundles/:id\
- **Auth Requirement:** Required
- **Required Role:** \PARTICIPANT\, \TEAM_CAPTAIN\
- **Request DTO:** None
- **Response DTO:**
  \\\json
  {
    "success": true,
    "data": {
      "id": "string",
      "title": "string",
      "releasedAt": "string (ISO Date)",
      "news": [
        {
          "id": "string",
          "title": "string",
          "content": "string"
        }
      ]
    }
  }
  \\\
- **Business Rules:**
  - ACTIVE bundles are accessible.
  - COMPLETED bundles are accessible.
  - PENDING bundles must return 404 NOT_FOUND_ERROR.
  - Non-existent bundles must return 404 NOT_FOUND_ERROR.
  - BundlePrices are never returned.
  - News content is returned.
  - Organizers must not use this endpoint.
  - The frontend should only call this endpoint after obtaining a bundle id from GET /users/active-news-bundle.;

content = content.replace(searchString, replaceString);

fs.writeFileSync('FRONTEND_INTEGRATION.md', content);
console.log('File updated successfully.');
