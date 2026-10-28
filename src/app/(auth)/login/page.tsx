"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, Button, Card, Form, Input, Spin, Typography } from "antd";
import { LockOutlined, UserOutlined } from "@ant-design/icons";
import {
  AppProvider,
  setupZhCNLocale,
} from "listpage-components";
import { getClientToken, loginRequest } from "@/lib/auth-client";
import { usePersistedProTheme } from "@/lib/use-persisted-pro-theme";
import { SkillsLogo } from "@/components/SkillsLogo";
import "@/styles/listpage-components.css";

setupZhCNLocale();

type LoginForm = {
  account: string;
  password: string;
};

function LoginFormCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (getClientToken()) {
      const from = searchParams.get("from");
      router.replace(from && from.startsWith("/") ? from : "/skills");
    }
  }, [router, searchParams]);

  const onFinish = async (values: LoginForm) => {
    setLoading(true);
    setError(null);
    try {
      await loginRequest(values.account, values.password);
      const from = searchParams.get("from");
      router.replace(from && from.startsWith("/") ? from : "/skills");
    } catch (e) {
      setError(e instanceof Error ? e.message : "登录失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card style={{ width: 400, maxWidth: "92vw" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          marginBottom: 4,
        }}
      >
        <SkillsLogo size={48} />
        <Typography.Title level={3} style={{ margin: 0, textAlign: "center" }}>
          技能管理
        </Typography.Title>
      </div>
      <Typography.Paragraph
        type="secondary"
        style={{ textAlign: "center", marginBottom: 24 }}
      >
        登录后继续使用
      </Typography.Paragraph>
      {error ? (
        <Alert
          type="error"
          showIcon
          message={error}
          style={{ marginBottom: 16 }}
        />
      ) : null}
      <Form<LoginForm>
        layout="vertical"
        requiredMark={false}
        onFinish={onFinish}
        initialValues={{ account: "", password: "" }}
      >
        <Form.Item
          name="account"
          label="账号"
          rules={[{ required: true, message: "请输入账号" }]}
        >
          <Input
            size="large"
            prefix={<UserOutlined />}
            placeholder="账号"
            autoComplete="username"
          />
        </Form.Item>
        <Form.Item
          name="password"
          label="密码"
          rules={[{ required: true, message: "请输入密码" }]}
        >
          <Input.Password
            size="large"
            prefix={<LockOutlined />}
            placeholder="密码"
            autoComplete="current-password"
          />
        </Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          size="large"
          block
          loading={loading}
        >
          登录
        </Button>
      </Form>
    </Card>
  );
}

export default function LoginPage() {
  const { appProviderProps } = usePersistedProTheme();

  return (
    <AppProvider {...appProviderProps}>
      <div
        style={{
          minHeight: "100vh",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f5f5",
        }}
      >
        <Suspense fallback={<Spin size="large" />}>
          <LoginFormCard />
        </Suspense>
      </div>
    </AppProvider>
  );
}
