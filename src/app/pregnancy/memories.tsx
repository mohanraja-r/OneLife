import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';
import { Camera, ImagePlus, Lock, Trash2 } from 'lucide-react-native';
import { MotiView } from 'moti';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import AnimatedPressable from '../../components/AnimatedPressable';
import AppHeader from '../../components/AppHeader';
import { ErrorNotice, LoadingState } from '../../components/ui';
import {
  Accents,
  Colors,
  Motion,
  Radius,
  Shadow,
  Spacing,
  Typography,
} from '../../constants/theme';
import { formatLongDate, startOfToday, toDateString } from '../../services/dates';
import { errorMessage } from '../../services/errors';
import {
  Memory,
  addMemory,
  deleteMemory,
  getMemories,
  signMemoryPhotos,
  uploadMemoryPhoto,
  weekAndDayOn,
} from '../../services/pregnancy';
import {
  PregnancyRecord,
  getPregnancy,
} from '../../services/women';

/** How many photos one memory can hold. */
const MAX_PHOTOS = 4;

/**
 * Save Memories — a week-anchored timeline of photographs from the pregnancy.
 *
 * Photos live in a private bucket, so nothing here has a permanent URL; each
 * render asks for short-lived signed links instead. That is also why the screen
 * says so plainly at the bottom — it is the one feature storing personal
 * pictures, and being explicit about who can see them is worth the space.
 */
export default function MemoriesScreen() {
  const [record, setRecord] = useState<PregnancyRecord | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [signed, setSigned] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Loads the timeline and signs every photo it references. */
  const load = useCallback(async () => {
    try {
      setError(null);
      const [pregnancy, entries] = await Promise.all([
        getPregnancy(),
        getMemories(),
      ]);
      setRecord(pregnancy);
      setMemories(entries);

      const paths = entries.flatMap((entry) => entry.photoPaths);
      if (paths.length > 0) setSigned(await signMemoryPhotos(paths));
    } catch (err) {
      setError(errorMessage(err, 'Could not load your memories.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  /** Uploads the picked images and files them under today's week. */
  const saveFrom = useCallback(
    async (assets: ImagePicker.ImagePickerAsset[]) => {
      if (!record || assets.length === 0) return;

      try {
        setUploading(true);
        const paths = await Promise.all(
          assets.slice(0, MAX_PHOTOS).map((asset) => uploadMemoryPhoto(asset.uri))
        );

        const date = toDateString(startOfToday());
        const { week, day } = weekAndDayOn(record.dueDate, date);
        await addMemory({
          date,
          week,
          dayOfWeek: day,
          caption: null,
          photoPaths: paths,
        });
        await load();
      } catch (err) {
        setError(errorMessage(err, 'Could not save that memory.'));
      } finally {
        setUploading(false);
      }
    },
    [record, load]
  );

  /** Takes a photo with the camera. */
  const capture = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Camera access needed',
        'Allow camera access in Settings to take a photo here.'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (!result.canceled) await saveFrom(result.assets);
  };

  /** Picks photos from the library. */
  const pick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS,
      quality: 0.7,
    });
    if (!result.canceled) await saveFrom(result.assets);
  };

  /** Removes a memory after confirming. */
  const confirmDelete = (memory: Memory) => {
    Alert.alert(
      'Delete this memory?',
      'The photos will be permanently removed.',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deleteMemory(memory);
                await load();
              } catch (err) {
                setError(errorMessage(err, 'Could not delete that memory.'));
              }
            })();
          },
        },
      ]
    );
  };

  const timeline = useMemo(() => memories, [memories]);

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Save Memories" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <ErrorNotice message={error} onRetry={() => void load()} />

        {loading ? (
          <LoadingState color={Accents.rose.main} />
        ) : (
          <MotiView
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: Motion.base }}>
            <View style={styles.addCard}>
              <Text style={styles.addTitle}>Add new memory</Text>
              <View style={styles.addRow}>
                <AnimatedPressable
                  onPress={() => void capture()}
                  style={styles.addButton}>
                  <Camera size={17} color={Accents.rose.main} strokeWidth={2.2} />
                  <Text style={styles.addButtonText}>Click a photo</Text>
                </AnimatedPressable>

                <AnimatedPressable
                  onPress={() => void pick()}
                  style={styles.addButton}>
                  <ImagePlus size={17} color={Accents.rose.main} strokeWidth={2.2} />
                  <Text style={styles.addButtonText}>Select a photo</Text>
                </AnimatedPressable>
              </View>

              {uploading && (
                <View style={styles.uploading}>
                  <ActivityIndicator size="small" color={Accents.rose.main} />
                  <Text style={styles.uploadingText}>Saving your photos…</Text>
                </View>
              )}
            </View>

            <Text style={styles.timelineTitle}>My timeline</Text>

            {timeline.length === 0 ? (
              <Text style={styles.empty}>
                Nothing saved yet. Add a bump photo and it will appear here with
                the week you were at.
              </Text>
            ) : (
              timeline.map((memory, index) => (
                <MotiView
                  key={memory.id}
                  from={{ opacity: 0, translateY: 10 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{
                    type: 'timing',
                    duration: Motion.fast,
                    delay: Motion.enterDelay + index * Motion.stagger,
                  }}
                  style={styles.entry}>
                  <View style={styles.spine}>
                    <View style={styles.spineDot} />
                    {index < timeline.length - 1 && (
                      <View style={styles.spineLine} />
                    )}
                  </View>

                  <View style={styles.entryBody}>
                    <View style={styles.entryHead}>
                      <View style={styles.entryHeadText}>
                        <Text style={styles.entryEyebrow}>When you were</Text>
                        <Text style={styles.entryWeek}>
                          {memory.week ?? 0} weeks {memory.dayOfWeek ?? 0} day
                          {(memory.dayOfWeek ?? 0) === 1 ? '' : 's'} pregnant
                        </Text>
                      </View>
                      <Text style={styles.entryDate}>
                        {formatLongDate(memory.date)}
                      </Text>
                    </View>

                    {memory.photoPaths.length > 0 && (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.photoRow}>
                        {memory.photoPaths.map((path) => {
                          const url = signed[path];
                          return (
                            <View key={path} style={styles.photoWrap}>
                              {url ? (
                                <Image
                                  source={{ uri: url }}
                                  style={styles.photo}
                                  contentFit="cover"
                                  transition={200}
                                />
                              ) : (
                                <View
                                  style={[styles.photo, styles.photoLoading]}
                                />
                              )}
                              <View style={styles.photoLock}>
                                <Lock
                                  size={9}
                                  color={Colors.textInverse}
                                  strokeWidth={2.6}
                                />
                              </View>
                            </View>
                          );
                        })}
                      </ScrollView>
                    )}

                    {!!memory.caption && (
                      <Text style={styles.caption}>{memory.caption}</Text>
                    )}

                    <AnimatedPressable
                      onPress={() => confirmDelete(memory)}
                      style={styles.deleteButton}
                      haptic={false}>
                      <Trash2 size={13} color={Colors.textMuted} />
                      <Text style={styles.deleteText}>Delete</Text>
                    </AnimatedPressable>
                  </View>
                </MotiView>
              ))
            )}

            <View style={styles.privacy}>
              <Lock size={13} color={Colors.textSecondary} strokeWidth={2.2} />
              <Text style={styles.privacyText}>
                Your memories are saved privately. Only you can see them.
              </Text>
            </View>
          </MotiView>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: {
    paddingHorizontal: Spacing.screen,
    paddingBottom: Spacing.navClearance,
  },
  addCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    ...Shadow.card,
  },
  addTitle: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  addRow: { flexDirection: 'row', gap: Spacing.md },
  addButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Accents.rose.tint,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
  },
  addButtonText: {
    ...Typography.label,
    fontWeight: '700',
    color: Accents.rose.dark,
  },
  uploading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  uploadingText: { ...Typography.label, color: Colors.textSecondary },
  timelineTitle: {
    ...Typography.cardTitle,
    color: Colors.textPrimary,
    marginTop: Spacing.xxl,
    marginBottom: Spacing.lg,
  },
  empty: {
    ...Typography.caption,
    color: Colors.textMuted,
    lineHeight: 19,
    paddingVertical: Spacing.lg,
  },
  entry: { flexDirection: 'row', gap: Spacing.md },
  spine: { width: 14, alignItems: 'center' },
  spineDot: {
    width: 10,
    height: 10,
    borderRadius: Radius.round,
    backgroundColor: Accents.rose.main,
    marginTop: 4,
  },
  spineLine: {
    flex: 1,
    width: 1.5,
    backgroundColor: Colors.borderStrong,
    marginTop: Spacing.xs,
  },
  entryBody: { flex: 1, paddingBottom: Spacing.xl },
  entryHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  entryHeadText: { flex: 1 },
  entryEyebrow: { ...Typography.label, color: Colors.textSecondary },
  entryWeek: {
    ...Typography.cardTitle,
    fontSize: 17,
    color: Colors.textPrimary,
    marginTop: 1,
  },
  entryDate: { ...Typography.label, color: Colors.textMuted },
  photoRow: { gap: Spacing.md, paddingTop: Spacing.md },
  photoWrap: { position: 'relative' },
  photo: {
    width: 108,
    height: 108,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceSunken,
  },
  photoLoading: { opacity: 0.6 },
  photoLock: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 18,
    height: 18,
    borderRadius: Radius.sm,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  caption: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    lineHeight: 19,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-start',
    marginTop: Spacing.md,
  },
  deleteText: { ...Typography.label, color: Colors.textMuted },
  privacy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceSunken,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
  },
  privacyText: {
    ...Typography.label,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
});
