class JwtService
  SECRET_KEY = Rails.application.secret_key_base
  EXPIRATION = 30.days

  def self.encode(payload)
    payload[:exp] = EXPIRATION.from_now.to_i
    payload[:iat] = Time.current.to_i
    JWT.encode(payload, SECRET_KEY, "HS256")
  end

  def self.decode(token)
    decoded = JWT.decode(token, SECRET_KEY, true, { algorithm: "HS256" })
    HashWithIndifferentAccess.new(decoded.first)
  rescue JWT::DecodeError, JWT::ExpiredSignature => e
    nil
  end
end
