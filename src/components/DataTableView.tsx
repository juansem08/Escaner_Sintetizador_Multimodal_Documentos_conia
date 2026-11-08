import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { makeStyles, radius, spacing, type } from '../theme';
import type { DataTable } from '../types';

const CELL_WIDTH = 150;

/** Tabla con scroll horizontal: las tablas extraídas pueden tener muchas columnas */
export function DataTableView({ table }: { table: DataTable }) {
  const styles = useStyles();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator style={styles.wrapper}>
      <View>
        <View style={[styles.row, styles.headerRow]}>
          {table.columns.map((col, i) => (
            <Text key={i} style={[styles.cell, styles.headerCell]}>
              {col}
            </Text>
          ))}
        </View>
        {table.rows.map((row, r) => (
          <View key={r} style={[styles.row, r % 2 === 1 && styles.zebra]}>
            {row.map((cell, c) => (
              <Text key={c} style={styles.cell} selectable>
                {cell || '—'}
              </Text>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const useStyles = makeStyles((c) =>
  StyleSheet.create({
    wrapper: { borderRadius: radius.md, backgroundColor: c.surfaceMuted },
    row: { flexDirection: 'row' },
    headerRow: { backgroundColor: c.accentSoft },
    zebra: { backgroundColor: c.surface },
    cell: {
      width: CELL_WIDTH,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      ...type.small,
      color: c.text,
    },
    headerCell: { fontFamily: type.label.fontFamily, color: c.accentText },
  }),
);
