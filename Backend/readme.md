# User Registration

## POST /users/register

### Description

Creates a new user account with the provided details.

### Required Data

• email : Must be a valid email address  
• fullname.firstname : At least 3 characters  
• password : At least 6 characters

### Response

• 201 : User successfully created  
• 400 : Validation errors or missing fields

```json
// Example request body
{
  "fullname": {
    "firstname": "John",
    "lastname": "Doe"
  },
  "email": "johndoe@example.com",
  "password": "secret123"
}
```

### Example Response

```json
{
  "token": "exampleToken",
  "user": {
    "_id": "userId",
    "firstname": "John",
    "lastname": "Doe",
    "email": "johndoe@example.com"
  }
}
```

## POST /users/login

### Description

Logs in an existing user.

### Required Data

• email : Must be a valid email address  
• password : At least 6 characters

### Response

• 200 : User successfully logged in  
• 401 : Invalid credentials or missing fields

```json
// Example request body
{
  "email": "johndoe@example.com",
  "password": "secret123"
}
```

### Example Response

```json
{
  "token": "exampleToken",
  "user": {
    "_id": "userId",
    "firstname": "John",
    "lastname": "Doe",
    "email": "johndoe@example.com"
  }
}
```

## GET /users/profile

### Description

Returns the authenticated user's profile.

### Required Data

None (authentication token is required in headers/cookies).

### Response

• 200 : User profile returned  
• 401 : Unauthorized or missing token

```json
// Example response
{
  "user": {
    "_id": "userId",
    "firstname": "John",
    "lastname": "Doe",
    "email": "johndoe@example.com"
  }
}
```

## GET /users/logout

### Description

Logs out the authenticated user, invalidating the current token.

### Required Data

None (authentication token is required in headers/cookies).

### Response

• 200 : Logout successful  
• 401 : Unauthorized if token is missing or invalid

```json
// Example response
{
  "message": "Logout successful"
}
```
# Captain Registration  
## POST /captain/register

### Description

Registers a new captain account.

### Required Data

• email : Must be a valid email address  
• fullname.firstname : At least 3 characters  
• password : At least 6 characters  
• vehicle : color, plate, capacity, and valid vehicleType

### Response

• 201 : Captain successfully created  
• 400 : Validation errors or missing fields

```json
// Example request body
{
  "fullname": {
    "firstname": "Jane",
    "lastname": "Doe"
  },
  "email": "janedoe@example.com",
  "password": "secret123",
  "vehicle": {
    "color": "Red",
    "plate": "XYZ123",
    "capacity": 3,
    "vehicleType": "car"
  }
}
```

## POST /captain/login

### Description

Logs in an existing captain.

### Required Data

• email  
• password

### Response

• 200 : Successful login  
• 401 : Invalid credentials

```json
// Example request body
{
  "email": "janedoe@example.com",
  "password": "secret123"
}
```

## GET /captain/profile

### Description

Returns the authenticated captain's profile.

### Required Data

None (requires token).

### Response

• 200 : Captain profile returned  
• 401 : Unauthorized

## GET /captain/logout

### Description

Logs out the authenticated captain.

### Required Data

None (requires token).

### Response

• 200 : Logout successful  
• 401 : Unauthorized

