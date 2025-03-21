import { Link, useNavigate } from "react-router-dom";
import { Avatar, Select } from "antd";
import { UserOutlined, LogoutOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";

const Header = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const { t, i18n } = useTranslation();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const toggleLanguage = (value) => {
    i18n.changeLanguage(value);
  };

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="text-xl font-bold text-indigo-600">
                Chat App
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                to="/"
                className="border-transparent text-gray-500 hover:text-gray-800 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                {t("auth.home")}
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Select
              value={i18n.language}
              onChange={toggleLanguage}
              className="w-[70px]"
              dropdownStyle={{ width: 70 }}
              options={[
                {
                  value: "tr",
                  label: (
                    <div className="flex justify-center items-center">
                      <img
                        src="https://flagcdn.com/w40/tr.png"
                        alt="Türkçe"
                        style={{ width: 24, height: 16, objectFit: "cover" }}
                      />
                    </div>
                  ),
                },
                {
                  value: "en",
                  label: (
                    <div className="flex justify-center items-center">
                      <img
                        src="https://flagcdn.com/w40/us.png"
                        alt="English"
                        style={{ width: 24, height: 16, objectFit: "cover" }}
                      />
                    </div>
                  ),
                },
              ]}
            />
            {token ? (
              <>
                <Link
                  to="/profile"
                  className="flex items-center space-x-2 text-gray-500 hover:text-gray-800"
                >
                  <Avatar
                    src={
                      user.profileImage
                        ? `${process.env.REACT_APP_API_URL}/uploads/profiles/${user.profileImage}`
                        : `${process.env.REACT_APP_API_URL}/uploads/profiles/profile.png`
                    }
                    icon={!user.profileImage && <UserOutlined />}
                    className="cursor-pointer"
                  />
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-2 border border-gray-400 hover:bg-gray-100 text-gray-400 rounded-md transition-colors"
                  title={t("auth.logout")}
                >
                  <LogoutOutlined className="text-lg" />
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                >
                  {t("auth.login")}
                </Link>
                <Link
                  to="/register"
                  className="ml-4 text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                >
                  {t("auth.register")}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
