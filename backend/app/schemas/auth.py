from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=6, max_length=128)


class LoginRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=6, max_length=128)


class RegisterResponse(BaseModel):
    user_id: int
    username: str
    tenant_id: int
    tenant_slug: str
    tenant_name: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "Bearer"
    tenant_id: int
    tenant_slug: str
    tenant_name: str
