import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Header from "../components/Header";
import { toast } from "react-toastify";
import { Modal } from "antd";
import { CameraOutlined, DeleteOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import "antd/dist/reset.css";

const Profile = () => {
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [imageLoading, setImageLoading] = useState(true);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const fetchProfile = async () => {
    try {
      if (!token) {
        navigate("/login");
        return;
      }

      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/auth/profile`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setUser(response.data);
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || t("errors.profileLoadError");
      setError(errorMessage);
      toast.error(errorMessage);
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [token, navigate]);

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("errors.fileSizeLimit"));
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error(t("errors.invalidImageType"));
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    const formData = new FormData();
    formData.append("profileImage", file);

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/auth/profile/image`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      storedUser.profileImage = response.data.profileImage;
      localStorage.setItem("user", JSON.stringify(storedUser));

      toast.success(t("success.imageUploaded"));
      fetchProfile();
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || t("errors.uploadError");
      toast.error(errorMessage);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
  };

  const showDeleteConfirm = () => {
    if (!user.profileImage || user.profileImage === "profile.png") {
      toast.info(t("profile.noImageToDelete"));
      return;
    }
    setIsDeleteModalVisible(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      setDeleteLoading(true);
      const response = await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/auth/profile/image`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      storedUser.profileImage = response.data.profileImage;
      localStorage.setItem("user", JSON.stringify(storedUser));

      toast.success(t("success.imageDeleted"));
      fetchProfile();
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || t("errors.deleteError");
      toast.error(errorMessage);
    } finally {
      setDeleteLoading(false);
      setIsDeleteModalVisible(false);
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteModalVisible(false);
  };

  const formatDate = (dateString) => {
    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    };
    return new Date(dateString).toLocaleDateString("tr-TR", options);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Header />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">{t("profile.loading")}</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Header />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="text-red-500 text-center">{error}</div>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Header />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="text-center">{t("profile.userNotFound")}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <div className="max-w-7xl mx-auto py-12 sm:px-6 lg:px-8">
        <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
          <div className="p-6">
            <div className="flex flex-row space-x-8">
              {/* Sol taraf - Profil fotoğrafı */}
              <div className="flex flex-col items-center">
                <div className="relative w-48 h-48">
                  {imageLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                  )}
                  <img
                    src={
                      user.profileImage
                        ? `${process.env.REACT_APP_API_URL}/uploads/profiles/${user.profileImage}`
                        : `${process.env.REACT_APP_API_URL}/uploads/profiles/profile.png`
                    }
                    alt=""
                    className={`w-48 border h-48 rounded-full object-cover mb-4 ${
                      imageLoading ? "opacity-0" : "opacity-100"
                    }`}
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                  />
                  <div className="absolute bottom-0 flex justify-between w-full">
                    <label
                      className="bg-indigo-600 text-white rounded-full p-2 cursor-pointer hover:bg-indigo-700 transition-colors ml-2"
                      title={t("profile.uploadImage")}
                    >
                      <CameraOutlined className="text-lg" />
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageUpload}
                        ref={fileInputRef}
                      />
                    </label>
                    {user.profileImage &&
                      user.profileImage !== "profile.png" && (
                        <button
                          className="bg-red-600 text-white rounded-full p-2 cursor-pointer hover:bg-red-700 transition-colors mr-2"
                          onClick={showDeleteConfirm}
                          title={t("profile.deleteImage")}
                        >
                          <DeleteOutlined className="text-lg" />
                        </button>
                      )}
                  </div>
                </div>
              </div>

              {/* Sağ taraf - Kullanıcı bilgileri */}
              <div className="flex-1 space-y-4">
                <div>
                  <div className="text-sm text-gray-500">
                    {t("profile.username")}:
                  </div>
                  <div className="text-lg font-medium">{user.username}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">
                    {t("profile.email")}:
                  </div>
                  <div className="text-lg">{user.email}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">
                    {t("profile.createdAt")}:
                  </div>
                  <div className="text-lg">{formatDate(user.createdAt)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        title={t("profile.deleteImageConfirm")}
        open={isDeleteModalVisible}
        onOk={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        confirmLoading={deleteLoading}
        okText={deleteLoading ? t("chat.sendingButton") : t("profile.delete")}
        cancelText={t("profile.cancel")}
        okButtonProps={{
          className: "bg-red-600 hover:bg-red-700",
          danger: true,
          loading: deleteLoading,
          disabled: deleteLoading,
        }}
      ></Modal>
    </div>
  );
};

export default Profile;
