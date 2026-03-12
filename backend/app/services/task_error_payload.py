def build_error_payload(code: str, message: str) -> dict[str, str]:
    return {"code": code, "message": message}
