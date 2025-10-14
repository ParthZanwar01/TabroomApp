import { useThemeColor } from '@/hooks/useThemeColor';
import React, { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

interface ParticlesBackgroundProps {
  children: React.ReactNode;
}

export default function ParticlesBackground({ children }: ParticlesBackgroundProps) {
  const [Particles, setParticles] = useState<any>(null);
  const [particlesConfig, setParticlesConfig] = useState<any>(null);
  const [particlesInit, setParticlesInit] = useState<any>(null);

  // Only load particles on web platform
  useEffect(() => {
    if (Platform.OS === 'web') {
      const loadParticles = async () => {
        try {
          const [
            { default: ParticlesComponent },
            { loadSlim },
            { Engine }
          ] = await Promise.all([
            import('@tsparticles/react'),
            import('@tsparticles/slim'),
            import('@tsparticles/engine')
          ]);

          setParticles(() => ParticlesComponent);
          
          const textColor = useThemeColor({}, 'text');
          const isDark = textColor === '#FFFFFF';

          const init = useCallback(async (engine: any) => {
            await loadSlim(engine);
          }, []);

          setParticlesInit(() => init);

          setParticlesConfig({
            background: {
              color: {
                value: isDark ? '#000000' : '#FFFFFF',
              },
            },
            fpsLimit: 120,
            interactivity: {
              events: {
                onClick: {
                  enable: true,
                  mode: "push",
                },
                onHover: {
                  enable: true,
                  mode: "repulse",
                },
                resize: true,
              },
              modes: {
                push: {
                  quantity: 4,
                },
                repulse: {
                  distance: 100,
                  duration: 0.4,
                },
              },
            },
            particles: {
              color: {
                value: textColor,
              },
              links: {
                color: textColor,
                distance: 150,
                enable: true,
                opacity: 0.5,
                width: 1,
              },
              collisions: {
                enable: true,
              },
              move: {
                direction: "none",
                enable: true,
                outModes: {
                  default: "bounce",
                },
                random: false,
                speed: 1,
                straight: false,
              },
              number: {
                density: {
                  enable: true,
                  area: 800,
                },
                value: 80,
              },
              opacity: {
                value: 0.5,
              },
              shape: {
                type: "circle",
              },
              size: {
                value: { min: 1, max: 5 },
              },
            },
            detectRetina: true,
          });
        } catch (error) {
          console.log('Failed to load particles:', error);
        }
      };

      loadParticles();
    }
  }, []);

  // On mobile, just return a simple container
  if (Platform.OS !== 'web') {
    return <View style={styles.container}>{children}</View>;
  }

  // On web, render particles if loaded
  if (!Particles || !particlesConfig || !particlesInit) {
    return <View style={styles.container}>{children}</View>;
  }

  return (
    <View style={styles.container}>
      <Particles
        id="tsparticles"
        init={particlesInit}
        options={particlesConfig}
        style={styles.particlesCanvas}
      />
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  particlesCanvas: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    zIndex: -1, // Ensure particles are in the background
  },
  content: {
    flex: 1,
    zIndex: 1, // Ensure content is above particles
  },
});