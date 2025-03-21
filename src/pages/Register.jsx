import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Form, Input, Button, Alert } from "antd";
import { UserOutlined, MailOutlined, LockOutlined } from "@ant-design/icons";
import { authService } from "../services/authService";
import { useTranslation } from "react-i18next";

const Register = () => {
  const { t } = useTranslation();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const handleSubmit = async (values) => {
    setError("");
    setLoading(true);

    try {
      const response = await authService.register(values);
      localStorage.setItem("token", response.token);
      navigate("/login");
    } catch (error) {
      setError(
        error.response?.data?.message || t("errors.registerError")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {t("auth.registerTitle")}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {t("auth.or")}{" "}
          <Link
            to="/login"
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            {t("auth.loginToAccount")}
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <Alert
              message="Hata"
              description={error}
              type="error"
              showIcon
              className="mb-4"
            />
          )}

          <Form
            form={form}
            name="register"
            onFinish={handleSubmit}
            autoComplete="off"
            layout="vertical"
          >
            <Form.Item
              name="username"
              rules={[
                {
                  required: true,
                  message: t("form.errors.usernameRequired"),
                },
                {
                  min: 3,
                  message: t("form.errors.usernameLength"),
                },
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder={t("auth.username")}
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="email"
              rules={[
                {
                  required: true,
                  message: t("form.errors.emailRequired"),
                },
                {
                  type: "email",
                  message: t("form.errors.emailInvalid"),
                },
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder={t("auth.email")}
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                {
                  required: true,
                  message: t("form.errors.passwordRequired"),
                },
                {
                  min: 6,
                  message: t("form.errors.passwordLength"),
                },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder={t("auth.password")}
                size="large"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 focus:bg-indigo-700"
                size="large"
                loading={loading}
              >
                {t("auth.register")}
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default Register;
