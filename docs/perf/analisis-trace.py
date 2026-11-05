import json, sys, collections, os
from multiprocessing import Pool

SP = '.'

SCRIPT = {'EvaluateScript', 'FunctionCall', 'v8.callFunction', 'TimerFire', 'FireAnimationFrame', 'FireIdleCallback',
          'RunMicrotasks', 'EventDispatch', 'v8.run', 'V8.Execute', 'HandlePostMessage', 'XHRReadyStateChange', 'XHRLoad',
          'ResourceFinish', 'FireIdleCallback', 'RunTask'}
COMPILE = {'v8.compile', 'V8.CompileCode', 'v8.compileModule', 'v8.produceCache', 'V8.ScriptCompiler', 'v8.parseOnBackground'}
STYLE = {'UpdateLayoutTree', 'ScheduleStyleRecalculation', 'RecalculateStyles', 'InvalidateLayout'}
LAYOUT = {'Layout', 'IntersectionObserverController::computeIntersections', 'ResizeObserverController::deliverObservations'}
PAINT = {'Paint', 'PrePaint', 'Layerize', 'Commit', 'CompositeLayers', 'UpdateLayer', 'HitTest', 'ImageDecodeTask', 'Decode Image', 'PaintImage', 'Animation'}
PARSE = {'ParseHTML', 'ParseAuthorStyleSheet'}


def cat(name):
    if name in ('MinorGC', 'MajorGC') or name.startswith('V8.GC') or name.startswith('BlinkGC'):
        return 'gc'
    if name in COMPILE:
        return 'compile'
    if name in STYLE:
        return 'style'
    if name in LAYOUT:
        return 'layout'
    if name in PAINT:
        return 'paint'
    if name in PARSE:
        return 'parse'
    if name in SCRIPT and name != 'RunTask':
        return 'script'
    if name == 'RunTask':
        return 'other'
    return 'other'


def analyse(arg):
    idx, label = arg
    d = json.load(open(label, encoding='utf-8'))
    if isinstance(d, list): d = {"traceEvents": d}
    d.setdefault("metadata", {})
    ev = d['traceEvents']
    meta = d['metadata']
    thr = {}
    for e in ev:
        if e.get('ph') == 'M' and e.get('name') == 'thread_name':
            thr[(e['pid'], e['tid'])] = e['args']['name']
    mains = [k for k, v in thr.items() if v == 'CrRendererMain']
    # choose renderer main with most RunTask
    cnt = collections.Counter((e['pid'], e['tid']) for e in ev if e.get('name') == 'RunTask' and (e['pid'], e['tid']) in mains)
    main = cnt.most_common(1)[0][0] if cnt else (mains[0] if mains else None)
    res = {'idx': idx, 'label': label, 'n_events': len(ev), 'url': '',
           'cpuThrottling': meta.get('cpuThrottling'), 'netThrottle': meta.get('networkThrottling')}
    # nav start
    nav = None
    for e in ev:
        if e.get('name') == 'navigationStart' and e.get('ph') in ('R', 'I'):
            a = e.get('args', {}).get('data', {})
            if a.get('isOutermostMainFrame', True):
                nav = e['ts']
                res['nav_url'] = a.get('documentLoaderURL', '')[:80]
                break
    ts_all = [e['ts'] for e in ev if 'ts' in e and e['ts'] > 0]
    t0, t1 = min(ts_all), max(ts_all)
    res['trace_ms'] = (t1 - t0) / 1000
    res['has_nav'] = nav is not None
    ref = nav if nav else t0
    # web vitals
    fcp = [e['ts'] for e in ev if e.get('name') == 'firstContentfulPaint']
    res['fcp_ms'] = (min(fcp) - ref) / 1000 if fcp else None
    lcp = [e for e in ev if e.get('name') == 'largestContentfulPaint::Candidate']
    if lcp:
        last = max(lcp, key=lambda e: e['ts'])
        res['lcp_ms'] = (last['ts'] - ref) / 1000
        dd = last.get('args', {}).get('data', {})
        res['lcp_node'] = f"{dd.get('type','')}/{dd.get('nodeName','')}/{dd.get('size','')}"
    else:
        res['lcp_ms'] = None
    cls = 0.0
    nshift = 0
    for e in ev:
        if e.get('name') == 'LayoutShift':
            dd = e.get('args', {}).get('data', {})
            if not dd.get('had_recent_input'):
                cls += dd.get('weighted_score_delta', dd.get('score', 0)) or 0
                nshift += 1
    res['cls'] = round(cls, 3)
    res['n_shifts'] = nshift
    for nm, key in (('MarkDOMContent', 'dcl_ms'), ('MarkLoad', 'load_ms')):
        t = [e['ts'] for e in ev if e.get('name') == nm]
        res[key] = (min(t) - ref) / 1000 if t else None
    # main thread self time
    if main:
        xs = [e for e in ev if e.get('ph') == 'X' and (e['pid'], e['tid']) == main and 'dur' in e]
        xs.sort(key=lambda e: (e['ts'], -e['dur']))
        selft = collections.Counter()
        selfn = collections.Counter()
        stack = []  # [end, name, childdur]
        def close(item):
            end, name, ch, dur = item
            s = max(0, dur - ch)
            selft[cat(name)] += s
            selfn[name] += s
        for e in xs:
            while stack and stack[-1][0] <= e['ts']:
                it = stack.pop(); close(it)
                if stack: stack[-1][2] += it[3]
            stack.append([e['ts'] + e['dur'], e['name'], 0, e['dur']])
        while stack:
            it = stack.pop(); close(it)
            if stack: stack[-1][2] += it[3]
        res['main_ms'] = {k: round(v / 1000) for k, v in selft.items()}
        res['top_self'] = [(k, round(v / 1000)) for k, v in selfn.most_common(8)]
        tasks = [e['dur'] for e in xs if e['name'] == 'RunTask']
        res['n_tasks'] = len(tasks)
        res['long_tasks'] = sum(1 for t in tasks if t > 50000)
        res['long_tasks_ms'] = round(sum(t for t in tasks if t > 50000) / 1000)
        res['tbt_ms'] = round(sum(t - 50000 for t in tasks if t > 50000) / 1000)
        res['max_task_ms'] = round(max(tasks) / 1000) if tasks else 0
        res['busy_ms'] = round(sum(tasks) / 1000)
        # top JS functions (inclusive, FunctionCall)
        fc = collections.Counter()
        fcn = collections.Counter()
        for e in xs:
            if e['name'] == 'FunctionCall':
                dd = e.get('args', {}).get('data', {})
                k = (dd.get('functionName') or '(anon)', (dd.get('url') or '').split('/')[-1][:40], dd.get('lineNumber'))
                fc[k] += e['dur']; fcn[k] += 1
        res['top_fn'] = [(k, round(v / 1000), fcn[k]) for k, v in fc.most_common(5)]
        ev_names = collections.Counter()
        for e in xs:
            if e['name'] in ('TimerFire', 'FireAnimationFrame', 'EventDispatch'):
                ev_names[e['name']] += 1
        res['timers'] = dict(ev_names)
        # EventDispatch types (interaction)
        ed = collections.Counter()
        edt = collections.Counter()
        for e in xs:
            if e['name'] == 'EventDispatch':
                tp = e.get('args', {}).get('data', {}).get('type')
                ed[tp] += 1; edt[tp] += e['dur']
        res['events'] = {k: (n, round(edt[k] / 1000)) for k, n in ed.most_common(6)}
    # compositor / gpu
    gpu = sum(e.get('dur', 0) for e in ev if e.get('name') == 'GPUTask')
    ras = sum(e.get('dur', 0) for e in ev if e.get('name') == 'RasterTask')
    res['gpu_ms'] = round(gpu / 1000); res['raster_ms'] = round(ras / 1000)
    res['n_updatelayer'] = sum(1 for e in ev if e.get('name') == 'UpdateLayer')
    res['n_rasters'] = sum(1 for e in ev if e.get('name') == 'RasterTask')
    # frames
    st = collections.Counter()
    for e in ev:
        if e.get('name') == 'PipelineReporter' and e.get('ph') == 'e':
            s = e.get('args', {}).get('chrome_frame_reporter', {}).get('state') or e.get('args', {}).get('data', {}).get('state')
            st[s] += 1
    res['frames'] = dict(st)
    # network
    reqs = {}
    for e in ev:
        n = e.get('name')
        if n == 'ResourceSendRequest':
            dd = e['args']['data']; reqs.setdefault(dd['requestId'], {})['url'] = dd.get('url', ''); reqs[dd['requestId']]['t'] = e['ts']
        elif n == 'ResourceReceiveResponse':
            dd = e['args']['data']; r = reqs.setdefault(dd['requestId'], {}); r['mime'] = dd.get('mimeType'); r['status'] = dd.get('statusCode'); r['cache'] = dd.get('fromCache') or dd.get('fromServiceWorker')
        elif n == 'ResourceFinish':
            dd = e['args']['data']; r = reqs.setdefault(dd['requestId'], {}); r['enc'] = dd.get('encodedDataLength', 0); r['dec'] = dd.get('decodedBodyLength', 0); r['tend'] = e['ts']
    res['n_req'] = len(reqs)
    res['net_enc_kb'] = round(sum(r.get('enc', 0) for r in reqs.values()) / 1024)
    big = sorted(reqs.values(), key=lambda r: -r.get('enc', 0))[:6]
    res['big_req'] = [(r.get('url', '').split('garap.local')[-1][:60], round(r.get('enc', 0) / 1024), r.get('mime')) for r in big]
    res['ext_hosts'] = sorted({r['url'].split('/')[2] for r in reqs.values() if r.get('url', '').startswith('http') and 'garap.local' not in r['url']})
    res['api_calls'] = sum(1 for r in reqs.values() if '/api/' in r.get('url', '') or '/monitoring' in r.get('url', ''))
    # per-URL repeated API calls
    ucount = collections.Counter(r.get('url', '').split('?')[0].split('garap.local')[-1] for r in reqs.values() if '/api/' in r.get('url', '') or '/monitoring' in r.get('url', ''))
    res['api_top'] = ucount.most_common(5)
    return res


if __name__ == '__main__':
    import glob, sys
    files = sorted(glob.glob(sys.argv[1] + '/*.json'))
    with Pool(3) as p:
        out = p.map(analyse, list(enumerate(files)))
    json.dump(out, open(sys.argv[2], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('done', len(out))
