import sys

content = open('query-performance.md', encoding='utf-8').read()
out = open('temp_parse_output.txt', 'w', encoding='utf-8')

rows = []
current_row = []
for line in content.split('\n'):
    if line.startswith('| ') and line.endswith(' |'):
        rows.append(line)
    elif line.startswith('|'):
         current_row = [line]
    elif line.endswith('|') and current_row:
         current_row.append(line)
         rows.append('\n'.join(current_row))
         current_row = []
    elif current_row:
         current_row.append(line)

if len(rows) < 3: sys.exit(0)

queries = []
for row in rows[2:]:
    parts = row.rsplit('|', 11)
    if len(parts) == 12:
        query = parts[1].strip()
        rolname = parts[2].strip()
        calls = parts[3].strip()
        mean_time = parts[4].strip()
        prop_total_time = parts[10].strip()
        try:
            queries.append({
                'query': query.replace('\n', ' ')[:150],
                'full_query': query,
                'rolname': rolname,
                'calls': int(calls or 0),
                'mean_time': float(mean_time or 0),
                'prop_total_time': float(prop_total_time or 0)
            })
        except:
            continue

app_queries = [q for q in queries if q['rolname'] in ('anon', 'authenticated')]
app_queries.sort(key=lambda x: x['prop_total_time'], reverse=True)

out.write('--- TOP 10 APP QUERIES BY PROP_TOTAL_TIME (Time Spent) ---\n')
for i, q in enumerate(app_queries[:10]):
    out.write(f"{i+1}. {q['prop_total_time']:.2f}% time | {q['calls']} calls | {q['mean_time']:.2f}ms/call | {q['query']}\n")

out.write('\n--- TOP 10 APP QUERIES BY MEAN_TIME (Slowest Queries) ---\n')
app_queries.sort(key=lambda x: x['mean_time'], reverse=True)
for i, q in enumerate(app_queries[:10]):
    out.write(f"{i+1}. {q['mean_time']:.2f}ms/call | {q['calls']} calls | {q['prop_total_time']:.2f}% time | {q['query']}\n")

out.write('\n--- TOP 10 APP QUERIES BY CALLS (Most Frequent) ---\n')
app_queries.sort(key=lambda x: x['calls'], reverse=True)
for i, q in enumerate(app_queries[:10]):
    out.write(f"{i+1}. {q['calls']} calls | {q['mean_time']:.2f}ms/call | {q['prop_total_time']:.2f}% time | {q['query']}\n")

out.write('\n--- TOP 10 OVERALL QUERIES (Including Postgres Admin) BY PROP_TOTAL_TIME ---\n')
queries.sort(key=lambda x: x['prop_total_time'], reverse=True)
for i, q in enumerate(queries[:10]):
    out.write(f"{i+1}. {q['prop_total_time']:.2f}% time | {q['calls']} calls | {q['mean_time']:.2f}ms/call [{q['rolname']}] | {q['query']}\n")

out.close()
