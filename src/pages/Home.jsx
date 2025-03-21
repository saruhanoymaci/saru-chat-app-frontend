import React, { useState, useEffect, useRef } from "react";
import { Layout, List, Input, Button, Avatar, message } from "antd";
import {
  SendOutlined,
  UserOutlined,
  SearchOutlined,
  LoadingOutlined,
  SmileOutlined,
} from "@ant-design/icons";
import EmojiPicker from "emoji-picker-react";
import Header from "../components/Header";
import io from "socket.io-client";
import { useNavigate } from "react-router-dom";
import { chatService } from "../services/chatService";
import { useTranslation } from "react-i18next";

const { Content, Sider } = Layout;

const Home = () => {
  const { t } = useTranslation();
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const socketRef = useRef();
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Kullanıcı bilgilerini localStorage'dan al
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      const storedToken = localStorage.getItem("token");

      if (!storedUser || !storedToken) {
        navigate("/login");
        return;
      }

      setUser(JSON.parse(storedUser));
      setToken(storedToken);
    } catch (error) {
      console.error("localStorage okuma hatası:", error);
      navigate("/login");
    }
  }, [navigate]);

  useEffect(() => {
    if (!user || !token) return;

    // Socket.IO bağlantısı
    socketRef.current = io(process.env.REACT_APP_API_URL, {
      auth: {
        token: token,
      },
    });

    // Kullanıcı bağlandığında tüm chatlerine katılır
    socketRef.current.emit("user_connected", user._id);

    // Debug için socket olaylarını dinle
    socketRef.current.on("connect", () => {
      console.log(t("chat.connected"));
    });

    socketRef.current.on("disconnect", () => {
      console.log(t("chat.disconnected"));
    });

    // Mesaj alma
    socketRef.current.on("receive_message", (data) => {
      console.log(t("chat.newMessage"), data);

      if (selectedChat && data.chatId === selectedChat._id) {
        setMessages((prev) => {
          // Eğer mesaj zaten varsa (geçici veya kalıcı), güncelle
          const messageExists = prev.some(
            (msg) =>
              msg._id === data.message._id ||
              (msg.isTemp && msg.content === data.message.content)
          );

          if (messageExists) {
            return prev.map((msg) =>
              msg._id === data.message._id ||
              (msg.isTemp && msg.content === data.message.content)
                ? { ...data.message, readBy: data.message.readBy || [] }
                : msg
            );
          }

          // Mesaj yoksa ekle
          return [...prev, { ...data.message, readBy: [] }];
        });

        // Eğer mesaj karşı taraftan geldiyse okundu olarak işaretle
        if (data.message.sender._id !== user._id) {
          markMessageAsRead(data.message._id);
        }
      }
      // Chat listesini güncelle
      fetchChats();
    });

    // Mesaj gönderme hatası
    socketRef.current.on("message_error", (data) => {
      message.error(data.error);
    });

    // Mesaj okundu bilgisi güncelleme
    socketRef.current.on("message_read_update", (data) => {
      if (selectedChat && data.chatId === selectedChat._id) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === data.messageId ? { ...msg, readBy: data.readBy } : msg
          )
        );
      }
    });

    // İlk yüklemede chatleri getir
    fetchChats();

    return () => {
      if (socketRef.current) {
        // Bağlantı kesilmeden önce odadan ayrıl
        if (selectedChat) {
          socketRef.current.emit("leave_chat", selectedChat._id);
        }
        socketRef.current.disconnect();
      }
    };
  }, [user, selectedChat, token]);

  const fetchChats = async () => {
    if (!user || !token) return;

    try {
      const chats = await chatService.getChats();
      setChats(chats);
    } catch (error) {
      message.error(t("chat.loadError"));
    }
  };

  const handleSearch = async (value) => {
    if (!value.trim() || !user || !token) return;

    setLoading(true);
    try {
      const results = await chatService.searchUsers(value);
      setSearchResults(results);
    } catch (error) {
      message.error(t("chat.searchError"));
    }
    setLoading(false);
  };

  const handleSelectChat = async (userId) => {
    if (!user || !token) return;

    try {
      const chat = await chatService.createOrGetChat(userId);

      // Yeni chat oluşturulduysa odaya katıl
      socketRef.current.emit("join_new_chat", chat._id);

      // Chat'i seç
      setSelectedChat(chat);

      // Mesajları ayrı bir istekle getir
      try {
        const chatWithMessages = await chatService.getChatById(chat._id);
        if (chatWithMessages && chatWithMessages.messages) {
          setMessages(chatWithMessages.messages);
        } else {
          setMessages([]);
        }
      } catch (error) {
        console.error("Mesajlar yüklenirken hata:", error);
        setMessages([]);
      }

      setSearchQuery("");
      setSearchResults([]);
    } catch (error) {
      message.error(t("chat.startError"));
    }
  };

  // Mesaj okundu bilgisini güncelleme
  const markMessageAsRead = async (messageId) => {
    if (!selectedChat) return;

    try {
      // Önce socket.io ile gönder
      socketRef.current.emit("message_read", {
        chatId: selectedChat._id,
        messageId: messageId,
        readerId: user._id,
      });

      // API çağrısını bir süre sonra yap
      setTimeout(async () => {
        try {
          await chatService.markMessageAsRead(selectedChat._id, messageId);
        } catch (error) {
          console.error("API mesaj okundu güncellemesi hatası:", error);
        }
      }, 500);
    } catch (error) {
      console.error("Mesaj okundu bilgisi güncellenirken hata:", error);
    }
  };

  // Mesajlar değiştiğinde okundu bilgisini güncelle
  useEffect(() => {
    if (selectedChat && messages.length > 0 && user) {
      const unreadMessages = messages.filter(
        (msg) =>
          msg.sender._id !== user._id &&
          !msg.readBy?.some((reader) => reader._id === user._id)
      );

      // Okunmamış mesajları sırayla işaretle
      unreadMessages.forEach((msg, index) => {
        setTimeout(() => {
          markMessageAsRead(msg._id);
        }, index * 300); // Her mesaj için 300ms bekle
      });
    }
  }, [messages, selectedChat, user]);

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedChat || !user || !token) return;

    setSendingMessage(true);
    try {
      // Yerel state'i geçici mesajla güncelle
      const tempMessageObj = {
        _id: Date.now().toString(),
        sender: {
          _id: user._id,
          username: user.username,
        },
        content: newMessage,
        timestamp: new Date(),
        isTemp: true,
        readBy: [],
      };
      setMessages((prev) => [...prev, tempMessageObj]);
      setNewMessage("");

      // Socket.IO ile mesajı gönder
      const receiverId = selectedChat.participants.find(
        (p) => p._id !== user._id
      )._id;
      socketRef.current.emit("send_message", {
        chatId: selectedChat._id,
        message: newMessage,
        senderId: user._id,
        receiverId,
      });
    } catch (error) {
      message.error("Mesaj gönderilirken bir hata oluştu");
      // Hata durumunda geçici mesajı kaldır
      setMessages((prev) => prev.filter((msg) => !msg.isTemp));
    } finally {
      setSendingMessage(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Mesajları en alta kaydırma fonksiyonu
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Mesajlar değiştiğinde veya chat seçildiğinde en alta kaydır
  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedChat]);

  const onEmojiClick = (emojiObject) => {
    setNewMessage((prevMessage) => prevMessage + emojiObject.emoji);
  };

  // Yükleme durumunu kontrol et
  if (!user) {
    return (
      <Layout className="min-h-screen">
        <Header />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <LoadingOutlined className="text-4xl text-indigo-600 mb-4" />
            <p className="text-gray-500">Yükleniyor...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout className="min-h-screen">
      <Header />
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
        <Layout className="bg-white mt-3 rounded-lg shadow-sm">
          <Sider
            width={300}
            theme="light"
            className="overflow-auto border-r border-gray-200 rounded-l-lg"
          >
            <div className="p-4">
              <Input.Search
                placeholder={t("chat.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  handleSearch(e.target.value);
                }}
                loading={loading}
              />
            </div>
            {searchResults.length > 0 ? (
              <List
                className="demo-loadmore-list"
                itemLayout="horizontal"
                dataSource={searchResults}
                renderItem={(user) => (
                  <List.Item
                    className="cursor-pointer hover:bg-gray-100 px-4 py-2"
                    onClick={() => handleSelectChat(user._id)}
                  >
                    <List.Item.Meta
                      className="flex items-center my-0 pl-2"
                      avatar={
                        <Avatar
                          className="flex items-center justify-center"
                          style={{ marginLeft: "8px" }}
                          src={
                            user.profileImage
                              ? `${process.env.REACT_APP_API_URL}/uploads/profiles/${user.profileImage}`
                              : `${process.env.REACT_APP_API_URL}/uploads/profiles/profile.png`
                          }
                          icon={!user.profileImage && <UserOutlined />}
                        />
                      }
                      title={
                        <span style={{ marginLeft: "8px" }}>
                          {user.username}
                        </span>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <List
                className="demo-loadmore-list"
                itemLayout="horizontal"
                dataSource={chats}
                renderItem={(chat) => {
                  const otherParticipant = chat.participants.find(
                    (p) => p._id !== user._id
                  );
                  const lastMessage = chat.messages[chat.messages.length - 1];
                  return (
                    <List.Item
                      className={`cursor-pointer hover:bg-gray-100 px-4 py-2 ${
                        selectedChat?._id === chat._id ? "bg-gray-100" : ""
                      }`}
                      onClick={() => {
                        setSelectedChat(chat);
                        setMessages(chat.messages || []);
                        // Chat seçildiğinde tüm okunmamış mesajları işaretle
                        const unreadMessages = chat.messages.filter(
                          (msg) =>
                            msg.sender._id !== user._id &&
                            !msg.readBy?.some(
                              (reader) => reader._id === user._id
                            )
                        );
                        unreadMessages.forEach((msg, index) => {
                          setTimeout(() => {
                            markMessageAsRead(msg._id);
                          }, index * 300);
                        });
                      }}
                    >
                      <List.Item.Meta
                        className="flex items-center my-0 pl-3"
                        avatar={
                          <Avatar
                            className="flex items-center justify-center"
                            style={{ marginLeft: "8px" }}
                            src={
                              otherParticipant.profileImage
                                ? `${process.env.REACT_APP_API_URL}/uploads/profiles/${otherParticipant.profileImage}`
                                : `${process.env.REACT_APP_API_URL}/uploads/profiles/profile.png`
                            }
                            icon={
                              !otherParticipant.profileImage && <UserOutlined />
                            }
                          />
                        }
                        title={
                          <div className="flex justify-between items-center ml-[8px]">
                            <span>{otherParticipant.username}</span>
                          </div>
                        }
                        description={
                          <span className="ml-[8px]">
                            {lastMessage
                              ? `${
                                  lastMessage.sender._id === user._id ||
                                  lastMessage.sender === user._id
                                    ? t("chat.you")
                                    : otherParticipant.username
                                }: ${lastMessage.content}`
                              : t("chat.noMessages")}
                          </span>
                        }
                      />
                    </List.Item>
                  );
                }}
              />
            )}
          </Sider>
          <Content className="bg-white rounded-r-lg">
            <div className="flex flex-col h-[calc(100vh-160px)]">
              {selectedChat ? (
                <>
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center">
                      <Avatar
                        src={
                          selectedChat.participants.find(
                            (p) => p._id !== user._id
                          ).profileImage
                            ? `${
                                process.env.REACT_APP_API_URL
                              }/uploads/profiles/${
                                selectedChat.participants.find(
                                  (p) => p._id !== user._id
                                ).profileImage
                              }`
                            : `${process.env.REACT_APP_API_URL}/uploads/profiles/profile.png`
                        }
                        icon={
                          !selectedChat.participants.find(
                            (p) => p._id !== user._id
                          ).profileImage && <UserOutlined />
                        }
                      />
                      <span className="ml-2 font-medium">
                        {
                          selectedChat.participants.find(
                            (p) => p._id !== user._id
                          ).username
                        }
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto p-4">
                    <List
                      itemLayout="horizontal"
                      dataSource={messages}
                      className="!border-none"
                      renderItem={(message) => {
                        const isMyMessage =
                          message.sender._id === user._id ||
                          message.sender === user._id;
                        return (
                          <List.Item
                            className={`!flex !p-0 !border-none mb-1 ${
                              isMyMessage ? "!justify-end" : "!justify-start"
                            }`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg p-3 ${
                                isMyMessage
                                  ? "bg-indigo-600 text-white rounded-br-none"
                                  : "bg-gray-100 text-gray-800 rounded-bl-none"
                              }`}
                            >
                              <div className="text-sm break-words">
                                {message.content}
                              </div>
                              <div
                                className={`text-xs mt-1 ${
                                  isMyMessage
                                    ? "text-indigo-100"
                                    : "text-gray-500"
                                }`}
                              >
                                {new Date(message.timestamp).toLocaleTimeString(
                                  [],
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}
                                {isMyMessage &&
                                  Array.isArray(message.readBy) && (
                                    <span className="ml-1">
                                      {message.isTemp
                                        ? "✓"
                                        : message.readBy.length > 0
                                        ? "✓✓"
                                        : "✓"}
                                    </span>
                                  )}
                              </div>
                            </div>
                          </List.Item>
                        );
                      }}
                    />
                    <div ref={messagesEndRef} />
                  </div>
                  <div className="p-4 border-t border-gray-200">
                    <div className="flex space-x-4">
                      <div className="flex-1 relative">
                        <Input.TextArea
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder={t("chat.messagePlaceholder")}
                          autoSize={{ minRows: 1, maxRows: 4 }}
                          className="pr-10"
                        />
                        <Button
                          type="text"
                          icon={<SmileOutlined />}
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        />
                        {showEmojiPicker && (
                          <div className="absolute bottom-full right-0 mb-2">
                            <div className="shadow-lg rounded-lg">
                              <EmojiPicker
                                onEmojiClick={onEmojiClick}
                                width={300}
                                height={400}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      <Button
                        type="primary"
                        icon={
                          sendingMessage ? (
                            <LoadingOutlined spin />
                          ) : (
                            <SendOutlined />
                          )
                        }
                        onClick={handleSend}
                        className="bg-indigo-600 hover:bg-indigo-700"
                        loading={sendingMessage}
                        disabled={sendingMessage}
                      >
                        {sendingMessage
                          ? t("chat.sendingButton")
                          : t("chat.sendButton")}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <SearchOutlined className="text-4xl text-gray-400 mb-4" />
                    <p className="text-gray-500">{t("chat.selectChat")}</p>
                  </div>
                </div>
              )}
            </div>
          </Content>
        </Layout>
      </div>
    </Layout>
  );
};

export default Home;
