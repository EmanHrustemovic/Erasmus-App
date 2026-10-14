from datetime import datetime
from typing import Optional, Literal, Annotated
from pydantic import BaseModel, EmailStr, Field

NonEmptyStr = Annotated[str, Field(min_length=1)]
OptionalNonEmptyStr = Annotated[Optional[str], Field(min_length=1)]

class ErasmusCallBase(BaseModel):
    title: NonEmptyStr
    country: NonEmptyStr
    description: NonEmptyStr
    deadline: NonEmptyStr
    link: NonEmptyStr
    erasmus_email: Optional[EmailStr] = None
    min_gpa: Annotated[float, Field(ge=0, le=10)] = 0
    required_docs: list[str] = []

class ErasmusCallCreate(ErasmusCallBase):
    pass

class ErasmusCallUpdate(BaseModel):
    title: OptionalNonEmptyStr = None
    country: OptionalNonEmptyStr = None
    description: OptionalNonEmptyStr = None
    deadline: OptionalNonEmptyStr = None
    link: OptionalNonEmptyStr = None
    erasmus_email: Optional[EmailStr] = None
    min_gpa: Annotated[Optional[float], Field(ge=0, le=10)] = None
    required_docs: Optional[list[str]] = None

class ErasmusCallOut(ErasmusCallBase):
    id: int

    class Config:
        from_attributes = True

class UserOut(BaseModel):
    id: int
    email: EmailStr
    role: str
    is_verified: bool
    two_factor_enabled: bool = False

    class Config:
        from_attributes = True

class AuthRequest(BaseModel):
    email: EmailStr
    password: NonEmptyStr

class PasswordCreateRequest(BaseModel):
    email: EmailStr
    password: Annotated[str, Field(min_length=8)]

class AuthResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserOut
    requires_2fa: bool = False
    two_factor_token: Optional[str] = None

class TwoFactorVerifyRequest(BaseModel):
    two_factor_token: NonEmptyStr
    code: Annotated[str, Field(min_length=6, max_length=8)]

class TwoFactorCodeRequest(BaseModel):
    code: Annotated[str, Field(min_length=6, max_length=8)]

class TwoFactorSetupOut(BaseModel):
    secret: str
    otpauth_uri: str
    qr_code: str

class MessageOut(BaseModel):
    message: str

class PushTokenRequest(BaseModel):
    token: NonEmptyStr
    platform: NonEmptyStr

class VerifyEmailRequest(BaseModel):
    token: NonEmptyStr

class ResendVerificationRequest(BaseModel):
    email: EmailStr

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: NonEmptyStr
    new_password: Annotated[str, Field(min_length=8)]

class ChangePasswordRequest(BaseModel):
    current_password: NonEmptyStr
    new_password: Annotated[str, Field(min_length=8)]

class ApplicationCreate(BaseModel):
    full_name: NonEmptyStr
    phone: NonEmptyStr
    department: NonEmptyStr
    gpa: Annotated[float, Field(ge=0, le=10)]
    notes: Optional[str] = None

class ApplicationOut(BaseModel):
    id: int
    call_id: int
    call_title: str
    user_email: EmailStr
    full_name: str
    phone: str
    department: str
    gpa: float
    notes: Optional[str] = None
    status: str
    created_at: datetime
    reviewed_at: Optional[datetime] = None
    reviewed_by_email: Optional[EmailStr] = None
    decision_reason: Optional[str] = None

class ApplicationStatusHistoryOut(BaseModel):
    id: int
    application_id: int
    status: str
    reason: Optional[str] = None
    changed_by_email: EmailStr
    changed_by_role: str
    created_at: datetime

    class Config:
        from_attributes = True

class ApplicationDocumentOut(BaseModel):
    id: int
    doc_type: str
    original_name: str
    size: int
    created_at: datetime

    class Config:
        from_attributes = True

class ApplicationDetailOut(BaseModel):
    id: int
    call_id: int
    call_title: str
    call_country: str
    call_deadline: str
    call_description: str
    call_link: str
    call_erasmus_email: Optional[EmailStr] = None
    user_email: EmailStr
    full_name: str
    phone: str
    department: str
    gpa: float
    notes: Optional[str] = None
    status: str
    created_at: datetime
    reviewed_at: Optional[datetime] = None
    reviewed_by_email: Optional[EmailStr] = None
    decision_reason: Optional[str] = None
    documents: list[ApplicationDocumentOut] = []

class ApplicationReviewRequest(BaseModel):
    status: Literal["approved", "rejected"]
    reason: OptionalNonEmptyStr = None

class BulkReviewRequest(BaseModel):
    ids: list[int]
    status: Literal["approved", "rejected"]
    reason: OptionalNonEmptyStr = None

class BulkReviewSkipped(BaseModel):
    id: int
    reason: str

class BulkReviewResult(BaseModel):
    updated: list[int]
    skipped: list[BulkReviewSkipped]

class NotificationOut(BaseModel):
    id: int
    title: str
    body: str
    created_at: datetime

    class Config:
        from_attributes = True

class InboxMessageOut(BaseModel):
    id: int
    subject: str
    body: str
    created_at: datetime
    read_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class InboxUnreadCountOut(BaseModel):
    count: int

class InboxBulkDeleteRequest(BaseModel):
    ids: list[int]

class InboxBulkActionOut(BaseModel):
    count: int

class AuditLogOut(BaseModel):
    id: int
    action: str
    application_id: Optional[int] = None
    call_title: str
    student_email: EmailStr
    reviewer_email: EmailStr
    status: str
    reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class LoginAuditOut(BaseModel):
    id: int
    email: EmailStr
    success: bool
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    reason: Optional[str] = None
    attempted_at: datetime

    class Config:
        from_attributes = True