import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Colors } from '../constants/theme';
import { supabase } from '../services/supabase';

type RouteDecision = 'loading' | 'signup' | 'onboarding' | 'home';

export default function Index() {
  const [decision, setDecision] = useState<RouteDecision>('loading');

  useEffect(() => {
    checkRoute();
  }, []);

  const checkRoute = async () => {
    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      setDecision('signup');
      return;
    }

    // Session exists — check whether onboarding has been completed
    // (a profiles row exists with a goal set).
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, goal')
      .eq('id', sessionData.session.user.id)
      .maybeSingle();

    if (!profile || !profile.goal) {
      setDecision('onboarding');
    } else {
      setDecision('home');
    }
  };

  if (decision === 'loading') {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: Colors.background,
        }}
      >
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  if (decision === 'signup') return <Redirect href="/signup" />;
  if (decision === 'onboarding') return <Redirect href="/onboarding/goal" />;
  return <Redirect href="/(tabs)/home" />;
}
