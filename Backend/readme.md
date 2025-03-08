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

